package com.fittrainer.data.api.challenges

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Desafíos del entrenador (E14), por el cliente con Bearer. Desafío ajeno o inexistente → 404
 * CHALLENGE_NOT_FOUND. Asignar uno que el alumno ya tiene activo → 409 CHALLENGE_ALREADY_ACTIVE.
 */
interface TrainerChallengesApi {
    /** Predefinidos primero y después los propios, cada grupo por nombre. */
    @GET("challenges")
    suspend fun list(): ChallengeListResponse

    @GET("students/{studentId}/challenges")
    suspend fun forStudent(@Path("studentId") studentId: String): AssignmentListResponse

    @POST("students/{studentId}/challenges")
    suspend fun assignToStudent(@Path("studentId") studentId: String, @Body body: AssignChallengeRequest): AssignmentResponse

    /** De 1 a 50 alumnos: los que ya lo tienen activo o ya no son del entrenador vuelven en skipped. */
    @POST("challenges/{id}/assignments")
    suspend fun assignMany(@Path("id") challengeId: String, @Body body: BatchAssignRequest): BatchAssignResponse
}
