package com.fittrainer.data.chat

import com.fittrainer.data.api.ErrorBody
import com.fittrainer.data.api.errorEnvelope
import java.io.IOException
import java.io.InterruptedIOException
import retrofit2.HttpException

private const val CHAT_LIMIT_REACHED = "CHAT_LIMIT_REACHED"
private const val CHAT_IN_PROGRESS = "CHAT_IN_PROGRESS"
internal const val SESSION_FINISHED = "SESSION_FINISHED"

/** El mensaje del backend para 503, por si el body no se puede leer. */
const val AI_UNAVAILABLE_FALLBACK_DATA = "El asistente no está disponible ahora. Seguí con tu entrenamiento."

/** Por qué falló una consulta al asistente; la UI elige el texto. */
sealed interface AiChatError {
    data object Offline : AiChatError
    data object Timeout : AiChatError
    data object DailyLimit : AiChatError
    data object InProgress : AiChatError
    data class TooManyAttempts(val retryAfterSeconds: Long?) : AiChatError
    data class Unavailable(val message: String) : AiChatError
    data object Unknown : AiChatError
}

class AiChatException(val error: AiChatError, cause: Throwable? = null) : Exception(cause)

/** El error de un HTTP [code] con su [body] ya leído (leer el body lo consume). */
internal fun httpAiChatError(code: Int, body: ErrorBody?, retryAfter: String?): AiChatError = when {
    code == 429 && body?.code == CHAT_LIMIT_REACHED -> AiChatError.DailyLimit
    code == 429 && body?.code == CHAT_IN_PROGRESS -> AiChatError.InProgress
    code == 429 -> AiChatError.TooManyAttempts(retryAfter?.toLongOrNull())
    code == 502 || code == 503 -> AiChatError.Unavailable(body?.message ?: AI_UNAVAILABLE_FALLBACK_DATA)
    else -> AiChatError.Unknown
}

/** Timeout antes que red: SocketTimeoutException y el callTimeout de OkHttp son InterruptedIOException. */
internal fun Throwable.toAiChatError(): AiChatError = when (this) {
    is AiChatException -> error
    is InterruptedIOException -> AiChatError.Timeout
    is IOException -> AiChatError.Offline
    is HttpException -> httpAiChatError(code(), errorEnvelope(), response()?.headers()?.get("Retry-After"))
    else -> AiChatError.Unknown
}
