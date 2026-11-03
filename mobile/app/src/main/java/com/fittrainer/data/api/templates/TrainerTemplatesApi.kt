package com.fittrainer.data.api.templates

import com.fittrainer.data.api.routines.TrainerRoutineDetailResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Plantillas del entrenador (solo las propias; va por el cliente con Bearer). Ajena o inexistente → 404
 * TEMPLATE_NOT_FOUND. instantiate copia la plantilla en una rutina del alumno (ADR 0003): 409 si la
 * plantilla está incompleta o tiene ejercicios que ya no existen.
 */
interface TrainerTemplatesApi {
    @GET("routine-templates")
    suspend fun list(): TemplateListResponse

    @GET("routine-templates/{id}")
    suspend fun get(@Path("id") id: String): TemplateDetailResponse

    @POST("routine-templates/{id}/instantiate")
    suspend fun instantiate(@Path("id") id: String, @Body body: InstantiateRequest): TrainerRoutineDetailResponse

    /** Guarda una rutina propia como plantilla. Solo interesa que salga bien. */
    @POST("routine-templates/from-routine")
    suspend fun fromRoutine(@Body body: FromRoutineRequest): Response<Unit>
}
