package com.fittrainer.data.api.routines

import kotlinx.serialization.json.JsonObject
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Rutinas del lado del entrenador (va por el cliente con Bearer). Ajena → 403, inexistente → 404.
 * POST /routines devuelve la fila con los ejercicios crudos: después se pide el detalle.
 */
interface TrainerRoutinesApi {
    @GET("routines")
    suspend fun list(@Query("student_id") studentId: String): TrainerRoutineListResponse

    @GET("routines/{id}")
    suspend fun get(@Path("id") id: String): TrainerRoutineDetailResponse

    @POST("routines")
    suspend fun create(@Body body: CreateRoutineRequest): CreatedRoutineResponse

    /** Nombre, objetivo, días o active. El body se arma a mano (RoutinePatch). Devuelve la fila, sin ejercicios. */
    @PATCH("routines/{id}")
    suspend fun update(@Path("id") id: String, @Body body: JsonObject): TrainerRoutineSummaryResponse

    @POST("routines/{id}/exercises")
    suspend fun addExercises(@Path("id") id: String, @Body body: AddExercisesRequest): Response<Unit>

    /** "Borrar" es la clave con null; "no tocar", la clave ausente. Devuelve el detalle. */
    @PATCH("routines/{id}/exercises/{reId}")
    suspend fun updateExercise(
        @Path("id") id: String,
        @Path("reId") routineExerciseId: String,
        @Body body: JsonObject,
    ): TrainerRoutineDetailResponse

    /** 204; 409 ROUTINE_NEEDS_EXERCISE si es el último. */
    @DELETE("routines/{id}/exercises/{reId}")
    suspend fun removeExercise(@Path("id") id: String, @Path("reId") routineExerciseId: String): Response<Unit>

    /** Todos los ejercicios de la rutina en el orden nuevo. Devuelve el detalle. */
    @PUT("routines/{id}/exercises/order")
    suspend fun reorder(@Path("id") id: String, @Body body: ReorderRequest): TrainerRoutineDetailResponse
}
