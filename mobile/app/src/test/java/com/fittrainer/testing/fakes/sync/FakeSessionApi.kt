package com.fittrainer.testing.fakes.sync

import com.fittrainer.data.api.CreateSessionRequest
import com.fittrainer.data.api.FailedSetDto
import com.fittrainer.data.api.SavedSetDto
import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.api.SessionSetsRequest
import com.fittrainer.data.api.SessionSetsResponse
import com.fittrainer.data.api.SessionSetsResult
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import retrofit2.Response

/** Backend en memoria: guarda lo que recibe y devuelve en minúscula, como el real. */
class FakeSessionApi : SessionApi {
    val created = mutableListOf<CreateSessionRequest>()
    /** Cuántas veces se llamó a create, haya fallado o no. */
    var createCalls = 0
    val batches = mutableListOf<Pair<String, SessionSetsRequest>>()
    var createError: Throwable? = null
    var setsError: Throwable? = null
    /** id de serie → code: esas vuelven en `failed`. */
    var failCodes: Map<String, String> = emptyMap()

    override suspend fun create(body: CreateSessionRequest) {
        createCalls++
        createError?.let { throw it }
        created += body
    }

    override suspend fun addSets(id: String, body: SessionSetsRequest): SessionSetsResponse {
        setsError?.let { throw it }
        batches += id to body
        val (bad, ok) = body.sets.withIndex().partition { it.value.id in failCodes }
        return SessionSetsResponse(
            SessionSetsResult(
                saved = ok.map { SavedSetDto(it.value.id.lowercase(), created = true) },
                failed = bad.map { FailedSetDto(it.value.id.lowercase(), it.index, failCodes.getValue(it.value.id)) },
            ),
        )
    }
}

fun httpError(code: Int) = HttpException(Response.error<Any>(code, "{}".toResponseBody("application/json".toMediaType())))
