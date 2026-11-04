package com.fittrainer.data.notifications.push

import com.fittrainer.data.api.notifications.NotificationsApi
import com.fittrainer.data.api.notifications.PushTokenDto
import com.fittrainer.data.auth.RequiredUser
import com.fittrainer.data.auth.tokenstore.TokenStore
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.userId
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Alta y baja del token de push en el backend, para el alumno y para el entrenador (E12): el backend toma
 * el rol del JWT. Lee la cuenta del
 * TokenStore (no de SessionRepository) para no hacer un ciclo con el cierre de sesión. Todo error
 * se traga y se loguea: el push es un extra y nunca tiene que romper el login ni el logout.
 */
@Singleton
class PushTokenRegistry @Inject constructor(
    private val api: NotificationsApi,
    private val tokenStore: TokenStore,
    private val source: FcmTokenSource,
    private val logger: PushLogger,
) {
    /** Al abrir la app o loguear: si hay alguien adentro, registra el token actual. */
    suspend fun registerIfSignedIn() = safely("No se pudo registrar el token de push") {
        ownerId()?.let { register(it, source.token()) }
    }

    /**
     * Como [registerIfSignedIn], pero dice si quedó bien: true si se registró o no hay sesión (nada que restaurar),
     * false si falló. Lo usa el reintento del logout para no dar por restaurado un alta que no llegó.
     */
    suspend fun registerCurrent(): Boolean {
        var ok = false
        safely("No se pudo registrar el token de push") {
            val owner = ownerId()
            if (owner != null) register(owner, source.token())
            ok = true
        }
        return ok
    }

    /** FCM rotó el token: se registra el nuevo (si hay alguien logueado). */
    suspend fun onNewToken(token: String) = safely("No se pudo registrar el token nuevo de push") {
        ownerId()?.let { register(it, token) }
    }

    /**
     * Baja del token del dispositivo. Va ANTES de borrar el JWT (la request lo necesita). Cada paso tiene
     * su propio tope corto: leer el token (2 s) y el DELETE (5 s); si no hay red, el logout no se queda
     * esperando. Si el token no se pudo leer, no hay nada que borrar.
     *
     * Devuelve el token leído (null si no había sesión o FCM no lo dio), aunque el DELETE haya fallado: el
     * logout lo manda también, y ese sí se reintenta sin red (#72).
     */
    suspend fun unregister(): String? {
        var read: String? = null
        safely("No se pudo dar de baja el token de push") {
            val owner = ownerId() ?: return@safely
            val token = withTimeoutOrNull(TOKEN_READ_TIMEOUT_MS) { source.token() }
            if (token == null) {
                logger.failed("No se pudo dar de baja el token de push", IllegalStateException("FCM no dio el token a tiempo"))
                return@safely
            }
            read = token
            val done = withTimeoutOrNull(UNREGISTER_TIMEOUT_MS) { api.removeToken(RequiredUser(owner), token) }
            if (done == null) {
                logger.failed("No se pudo dar de baja el token de push", IllegalStateException("El DELETE no respondió a tiempo"))
            }
        }
        return read
    }

    /**
     * Registra el token cada vez que entra una cuenta (alumno o entrenador). Se mapea al id (null si no hay
     * sesión) antes del distinctUntilChanged: así, cerrar sesión y volver a entrar con la misma cuenta
     * registra de nuevo el token que el logout dio de baja.
     */
    suspend fun registerOnSessions(sessions: Flow<Session>) {
        sessions.map { it.userId }
            .distinctUntilChanged()
            .collect { id -> if (id != null) registerIfSignedIn() }
    }

    private suspend fun register(ownerId: String, token: String) =
        api.registerToken(RequiredUser(ownerId), PushTokenDto(token))

    private suspend fun ownerId(): String? = tokenStore.current()?.user?.id

    private suspend fun safely(what: String, block: suspend () -> Unit) {
        try {
            block()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            logger.failed(what, e)
        }
    }

    private companion object {
        const val TOKEN_READ_TIMEOUT_MS = 2_000L
        const val UNREGISTER_TIMEOUT_MS = 5_000L
    }
}
