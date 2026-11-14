package com.fittrainer.data.auth

import com.fittrainer.data.api.errorCodeOf
import com.fittrainer.data.auth.tokenstore.TokenStore
import javax.inject.Inject
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/**
 * GX1: con la clave blanqueada por el PT, el backend responde 403 `PASSWORD_CHANGE_REQUIRED` a todo salvo el cambio de
 * clave. Ante ese 403 pone la marca en la sesión guardada, así la raíz muestra la pantalla para elegir una nueva aunque
 * la sesión venga de antes de la marca (app vieja, refresh sin el campo). La respuesta sigue igual hacia quien la pidió.
 *
 * Solo marca la sesión que hizo el pedido ([SessionTag]) y solo si su access token sigue siendo el guardado: un 403 de
 * una sesión cerrada, de otra cuenta o de un access ya reemplazado por el cambio de clave no bloquea a nadie. Un 403
 * con otro código (rol equivocado) pasa sin tocar nada. Va después de [AuthInterceptor], que pone el tag.
 */
class PasswordChangeRequiredInterceptor @Inject constructor(
    private val tokenStore: TokenStore,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val response = chain.proceed(chain.request())
        if (response.code != FORBIDDEN) return response
        // La request final (la del reintento del TokenAuthenticator, si hubo) lleva el tag y el access con que salió.
        val request = response.request
        val tag = request.tag(SessionTag::class.java) ?: return response
        val token = request.header(AuthInterceptor.AUTHORIZATION)?.removePrefix("Bearer ") ?: return response
        // peekBody no consume el body: quien hizo el pedido lo sigue leyendo entero.
        val code = runCatching { errorCodeOf(response.peekBody(MAX_ERROR_BODY).string()) }.getOrNull()
        if (code == PASSWORD_CHANGE_REQUIRED) {
            // Una falla del disco no rompe la respuesta: el próximo 403 lo vuelve a intentar.
            runCatching { runBlocking { tokenStore.setMustChangePassword(tag.sessionId, true, accessToken = token) } }
        }
        return response
    }

    companion object {
        const val PASSWORD_CHANGE_REQUIRED = "PASSWORD_CHANGE_REQUIRED"
        private const val FORBIDDEN = 403
        private const val MAX_ERROR_BODY = 16_384L
    }
}
