package com.fittrainer.data.api.exercises

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/** Catálogo del entrenador: sus ejercicios propios y los globales, por nombre (va por el cliente con Bearer). */
interface TrainerExercisesApi {
    @GET("exercises")
    suspend fun list(@Query("include_global") includeGlobal: Boolean = true): TrainerExerciseListResponse

    /** Alta de un ejercicio propio (E10). El body se arma en el formulario; devuelve la fila. */
    @POST("exercises")
    suspend fun create(@Body body: JsonObject): TrainerExerciseResponse

    /** Solo lo que cambió; "borrar" es la clave con null. Ajeno → 403, inexistente → 404. */
    @PATCH("exercises/{id}")
    suspend fun update(@Path("id") id: String, @Body body: JsonObject): TrainerExerciseResponse

    /** 204; 409 EXERCISE_IN_USE si está en una rutina o en una sesión. */
    @DELETE("exercises/{id}")
    suspend fun delete(@Path("id") id: String): Response<Unit>
}

@Serializable
data class TrainerExerciseResponse(val data: TrainerExerciseDto)

@Serializable
data class TrainerExerciseListResponse(val data: List<TrainerExerciseDto> = emptyList())

@Serializable
data class TrainerExerciseDto(
    val id: String,
    @SerialName("trainer_id") val trainerId: String? = null,
    val name: String,
    @SerialName("muscle_group") val muscleGroup: String? = null,
    val equipment: String? = null,
    val description: String? = null,
    @SerialName("video_url") val videoUrl: String? = null,
    @SerialName("is_global") val isGlobal: Boolean = false,
)
