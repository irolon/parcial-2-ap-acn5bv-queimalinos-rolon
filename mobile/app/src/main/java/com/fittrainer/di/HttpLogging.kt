package com.fittrainer.di

import okhttp3.logging.HttpLoggingInterceptor

// El token de invitación viaja en la URL (GET invitations/{token}) y con él se completa el alta:
// es una credencial, igual que el Bearer.
private val INVITATION_PATH = Regex("(/invitations/)[^/?#\\s]+")
private val TOKEN_PARAM = Regex("([?&]token=)[^&#\\s]+")

/** Reemplaza los secretos que pueden aparecer en una URL por "[redactado]". */
internal fun redactUrlSecrets(message: String): String = message
    .replace(INVITATION_PATH, "$1[redactado]")
    .replace(TOKEN_PARAM, "$1[redactado]")

/**
 * Log HTTP de debug: solo línea de request/response (BASIC, sin bodies ni headers), con los secretos
 * de la URL redactados. [log] es el destino; por defecto, el logcat de OkHttp.
 */
internal fun httpLogging(
    log: HttpLoggingInterceptor.Logger = HttpLoggingInterceptor.Logger.DEFAULT,
): HttpLoggingInterceptor =
    HttpLoggingInterceptor { message -> log.log(redactUrlSecrets(message)) }
        .setLevel(HttpLoggingInterceptor.Level.BASIC)
        .apply { redactHeader("Authorization") }
