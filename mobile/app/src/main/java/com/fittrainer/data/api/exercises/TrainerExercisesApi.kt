package com.fittrainer.data.api.exercises

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.Query

/** Catálogo del entrenador: sus ejercicios propios y los globales, por nombre (va por el cliente con Bearer). */
interface TrainerExercisesApi {
    @GET("exercises")
    suspend fun list(@Query("include_global") includeGlobal: Boolean = true): TrainerExerciseListResponse
}

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
