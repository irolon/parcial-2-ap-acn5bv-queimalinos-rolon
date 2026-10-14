package com.fittrainer.data.auth

import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.api.RefreshRequest
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import retrofit2.HttpException

/**
 * Ante un 401 renueva el access token con el refresh token y reintenta una vez.
 * Si el backend rechaza el refresh (401/400) la sesión se borra y la app vuelve al login;
 * si el refresh falla por red, la sesión queda y la llamada falla como cualquier error.
 *
 * Solo actúa sobre requests marcadas con [SessionTag] y solo si esa sesión sigue siendo la guardada:
 * si en el medio se cerró sesión o entró otra cuenta, el 401 se devuelve tal cual. Así nunca se
 * reenvía una request de una cuenta con el token de otra, ni un refresh viejo pisa o borra la sesión nueva.
 */
class TokenAuthenticator @Inject constructor(
    private val tokenStore: TokenStore,
    private val authApi: AuthApi,
) : Authenticator {

    // Varias llamadas con 401 a la vez → un solo refresh.
    private val mutex = Mutex()

    override fun authenticate(route: Route?, response: Response): Request? {
        if (response.priorResponse != null) return null
        val request = response.request
        // Sin tag no es una request que hayamos autenticado nosotros.
        val tag = request.tag(SessionTag::class.java) ?: return null
        val failedToken = request.header(AuthInterceptor.AUTHORIZATION)
            ?.removePrefix("Bearer ")
            ?: return null

        return runBlocking {
            mutex.withLock {
                val current = tokenStore.current()
                // Sesión cerrada u otra cuenta: no se reintenta con tokens que no son de esta request.
                if (current == null || current.sessionId != tag.sessionId) return@withLock null
                if (current.accessToken != failedToken) {
                    // Otro hilo ya renovó esta misma sesión.
                    return@withLock request.withBearer(current.accessToken)
                }
                val token = refresh(current) ?: return@withLock null
                // El refresh puede terminar después de un logout/login: solo se reintenta si la sesión sigue.
                if (tokenStore.current()?.sessionId != current.sessionId) return@withLock null
                request.withBearer(token)
            }
        }
    }

    /** Devuelve el access token nuevo, o null si no se pudo renovar. */
    private suspend fun refresh(current: AuthState): String? = try {
        val token = authApi.refresh(RefreshRequest(current.refreshToken)).token
        tokenStore.updateAccessToken(current.sessionId, token)
        token
    } catch (e: CancellationException) {
        throw e
    } catch (e: HttpException) {
        if (e.code() == 401 || e.code() == 400) closeSession(current.sessionId)
        null
    } catch (e: Exception) {
        null
    }

    private suspend fun closeSession(sessionId: String) {
        try {
            tokenStore.clearIf(sessionId)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Falla del disco: el store ya la da por cerrada en memoria; el 401 sigue su curso.
        }
    }

    // newBuilder() conserva los tags: el reintento sigue marcado con su sesión.
    private fun Request.withBearer(token: String): Request =
        newBuilder().header(AuthInterceptor.AUTHORIZATION, "Bearer $token").build()
}
