package com.fittrainer.data.auth

/**
 * Tag de OkHttp que [AuthInterceptor] pone en cada request autenticada: dice con qué sesión salió.
 * [TokenAuthenticator] lo usa para no reintentar con los tokens de otra cuenta.
 */
data class SessionTag(val sessionId: String)
