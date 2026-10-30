package com.fittrainer.data.api

import com.fittrainer.data.auth.RequiredUser
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Tag

/** POST /sessions: la sesión ya terminada (el RPE y las notas son de la tarjeta 12). */
@Serializable
data class CreateSessionRequest(
    val id: String,
    @SerialName("routine_id") val routineId: String?,
    @SerialName("started_at") val startedAt: String,
    @SerialName("finished_at") val finishedAt: String?,
)

@Serializable
data class SessionSetDto(
    val id: String,
    @SerialName("exercise_id") val exerciseId: String,
    @SerialName("original_exercise_id") val originalExerciseId: String?,
    @SerialName("routine_exercise_id") val routineExerciseId: String?,
    @SerialName("set_number") val setNumber: Int,
    @SerialName("actual_reps") val actualReps: Int,
    @SerialName("actual_kg") val actualKg: Double,
    @SerialName("executed_at") val executedAt: String,
)

@Serializable
data class SessionSetsRequest(val sets: List<SessionSetDto>)

@Serializable
data class SavedSetDto(val id: String, val created: Boolean)

/** index: posición de la serie en el lote que se mandó. */
@Serializable
data class FailedSetDto(val id: String? = null, val index: Int, val code: String)

@Serializable
data class SessionSetsResult(val saved: List<SavedSetDto> = emptyList(), val failed: List<FailedSetDto> = emptyList())

@Serializable
data class SessionSetsResponse(val data: SessionSetsResult)

/**
 * Módulo Sesiones (contratos-api.md). Va por el cliente principal: Bearer y refresh transparente.
 * [RequiredUser] es el dueño de la sesión: si la cuenta logueada es otra, la request no sale.
 */
interface SessionApi {
    @POST("sessions")
    suspend fun create(@Tag owner: RequiredUser, @Body body: CreateSessionRequest)

    @POST("sessions/{id}/sets")
    suspend fun addSets(@Tag owner: RequiredUser, @Path("id") id: String, @Body body: SessionSetsRequest): SessionSetsResponse
}
