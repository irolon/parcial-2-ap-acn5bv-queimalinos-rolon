package com.fittrainer.data.auth

import java.io.IOException

/**
 * Marca (tag de Retrofit) de una request que solo puede salir con la cuenta de [userId]: la subida
 * offline lleva al dueño de cada sesión. [AuthInterceptor] la frena si la cuenta guardada es otra.
 */
data class RequiredUser(val userId: String)

/** La cuenta guardada no es la que pedía [RequiredUser]: la request no salió. */
class AccountChangedException : IOException("La cuenta cambió: la request no salió")
