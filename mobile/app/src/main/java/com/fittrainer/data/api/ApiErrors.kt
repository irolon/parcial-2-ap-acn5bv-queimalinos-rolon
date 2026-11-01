package com.fittrainer.data.api

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import retrofit2.HttpException

@Serializable
private data class ErrorEnvelope(val error: ErrorBody? = null)

/** `{ error: { code, message, details } }` del backend (shared/utils/errors.js). */
@Serializable
data class ErrorBody(
    val code: String? = null,
    val message: String? = null,
    val details: List<ErrorDetail> = emptyList(),
)

@Serializable
data class ErrorDetail(val field: String? = null, val message: String? = null)

private val errorJson = Json { ignoreUnknownKeys = true }

/** `error.code` del body de un error del backend, o null si el body no se puede leer. Consume el body. */
fun HttpException.errorCode(): String? = try {
    response()?.errorBody()?.string()?.let { errorJson.decodeFromString<ErrorEnvelope>(it).error?.code }
} catch (e: Exception) {
    null
}

/** El error completo (código, mensaje y detalles por campo), o null si el body no se puede leer. Consume el body. */
fun HttpException.errorEnvelope(): ErrorBody? = try {
    response()?.errorBody()?.string()?.let { errorJson.decodeFromString<ErrorEnvelope>(it).error }
} catch (e: Exception) {
    null
}
