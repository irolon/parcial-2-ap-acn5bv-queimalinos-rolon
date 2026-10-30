package com.fittrainer.data.auth

import com.fittrainer.data.auth.tokenstore.TokenStore
import javax.inject.Inject
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Agrega `Authorization: Bearer <access>` a cada request si hay sesión y la marca con su [SessionTag].
 * Una request con [RequiredUser] de otra cuenta (o sin sesión) no sale: tira [AccountChangedException].
 */
class AuthInterceptor @Inject constructor(
    private val tokenStore: TokenStore,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val path = request.url.encodedPath
        val required = request.tag(RequiredUser::class.java)
        // No pisa un header explícito ni autentica los endpoints que emiten tokens.
        val bypass = request.header(AUTHORIZATION) != null || UNAUTHENTICATED_PATHS.any { path.endsWith(it) }
        if (bypass && required == null) return chain.proceed(request)
        val state = runBlocking { tokenStore.current() }
        // El token se lee acá, en cada request: si la cuenta cambió desde que se armó, no sale con la nueva.
        // Va antes del bypass: la garantía no depende de cómo se armó la request.
        if (required != null && state?.user?.id != required.userId) throw AccountChangedException()
        if (bypass || state == null) return chain.proceed(request)
        return chain.proceed(
            request.newBuilder()
                .header(AUTHORIZATION, "Bearer ${state.accessToken}")
                .tag(SessionTag::class.java, SessionTag(state.sessionId))
                .build()
        )
    }

    companion object {
        const val AUTHORIZATION = "Authorization"
        private val UNAUTHENTICATED_PATHS = listOf("/auth/login", "/auth/refresh")
    }
}
