package com.fittrainer.data.api.trainerai

import com.fittrainer.data.auth.RequiredUser
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Tag

/**
 * Asistente IA del entrenador (E15). La IA propone y el backend guarda una plantilla por bloque; nunca asigna.
 * Las dos llevan [RequiredUser]: lo que pidió una cuenta nunca sale con el JWT de otra.
 */
interface TrainerAiApi {
    @POST("trainer-ai/generate-routine")
    suspend fun generate(@Tag owner: RequiredUser, @Body body: GenerateRoutineRequest): GenerateRoutineResponse

    @POST("trainer-ai/save-as-template")
    suspend fun save(@Tag owner: RequiredUser, @Body body: SaveAsTemplateRequest): SaveAsTemplateResponse
}
