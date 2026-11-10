package com.fittrainer.data.trainerai

import com.fittrainer.data.api.ErrorBody
import java.io.IOException
import java.io.InterruptedIOException
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import retrofit2.HttpException

/** Lo que puede salir mal con el asistente del entrenador (E15). Los mensajes del backend se muestran tal cual. */
sealed interface TrainerAiError {
    data object Offline : TrainerAiError
    data object Timeout : TrainerAiError
    data class TooManyAttempts(val message: String?, val retryAfterSeconds: Long?) : TrainerAiError
    data class Unavailable(val message: String?) : TrainerAiError
    data class InvalidResponse(val message: String?) : TrainerAiError
    data class Validation(val fields: Map<String, String>, val message: String?) : TrainerAiError
    data object StudentGone : TrainerAiError
    data object GenerationGone : TrainerAiError
    data object AlreadySaved : TrainerAiError
    data class ExercisesUnavailable(val message: String?) : TrainerAiError
    data object Unknown : TrainerAiError
}

class TrainerAiException(val error: TrainerAiError, cause: Throwable? = null) : Exception(error.toString(), cause)

@Serializable
private data class Envelope(val error: ErrorBody? = null)

private val errorJson = Json { ignoreUnknownKeys = true }

/** Un error HTTP de /trainer-ai: [body] es el JSON del backend y [retryAfter] el header Retry-After. */
fun trainerAiHttpError(code: Int, body: String?, retryAfter: String?): TrainerAiError {
    val error = body?.let { runCatching { errorJson.decodeFromString<Envelope>(it).error }.getOrNull() }
    val message = error?.message?.takeIf { it.isNotBlank() }
    return when {
        code == 429 -> TrainerAiError.TooManyAttempts(message, retryAfter?.trim()?.toLongOrNull())
        code == 503 -> TrainerAiError.Unavailable(message)
        code == 502 -> TrainerAiError.InvalidResponse(message)
        code == 409 && error?.code == "GENERATION_ALREADY_SAVED" -> TrainerAiError.AlreadySaved
        code == 404 && error?.code == "GENERATION_NOT_FOUND" -> TrainerAiError.GenerationGone
        code == 404 || code == 403 -> TrainerAiError.StudentGone
        code == 400 && error?.code == "TEMPLATE_EXERCISES_UNAVAILABLE" -> TrainerAiError.ExercisesUnavailable(message)
        code == 400 && error != null -> TrainerAiError.Validation(
            error.details.mapNotNull { d -> d.field?.let { it to d.message.orEmpty() } }.toMap(),
            message,
        )
        else -> TrainerAiError.Unknown
    }
}

/** El timeout de OkHttp (InterruptedIOException) se distingue de la falta de red (IOException). */
fun Throwable.toTrainerAiError(): TrainerAiError = when (this) {
    is TrainerAiException -> error
    is HttpException -> trainerAiHttpError(code(), response()?.errorBody()?.string(), response()?.headers()?.get("Retry-After"))
    is InterruptedIOException -> TrainerAiError.Timeout
    is IOException -> TrainerAiError.Offline
    else -> TrainerAiError.Unknown
}
