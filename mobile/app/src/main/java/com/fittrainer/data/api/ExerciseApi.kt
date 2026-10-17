package com.fittrainer.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET

/** Biblioteca del alumno logueado: globales + los de su entrenador (va por el cliente con Bearer). */
interface ExerciseApi {
    @GET("exercises/library")
    suspend fun library(): LibraryResponse
}

@Serializable
data class LibraryResponse(val data: List<LibraryExerciseDto> = emptyList())

@Serializable
data class LibraryExerciseDto(
    val id: String,
    val name: String,
    @SerialName("muscle_group") val muscleGroup: String? = null,
    val equipment: String? = null,
    val description: String? = null,
    @SerialName("video_url") val videoUrl: String? = null,
)
