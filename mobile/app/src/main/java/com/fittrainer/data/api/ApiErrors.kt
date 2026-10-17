package com.fittrainer.data.api

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import retrofit2.HttpException

@Serializable
private data class ErrorEnvelope(val error: ErrorBody? = null)

@Serializable
private data class ErrorBody(val code: String? = null)

private val errorJson = Json { ignoreUnknownKeys = true }

/** `error.code` del body de un error del backend, o null si el body no se puede leer. Consume el body. */
fun HttpException.errorCode(): String? = try {
    response()?.errorBody()?.string()?.let { errorJson.decodeFromString<ErrorEnvelope>(it).error?.code }
} catch (e: Exception) {
    null
}
