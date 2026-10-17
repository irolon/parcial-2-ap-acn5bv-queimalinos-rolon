package com.fittrainer.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET

/** Rutinas del alumno logueado (va por el cliente con Bearer). */
interface RoutineApi {
    @GET("routines/mine")
    suspend fun mine(): MineResponse
}

@Serializable
data class MineResponse(val data: List<StudentRoutineDto> = emptyList())

@Serializable
data class StudentRoutineDto(
    @SerialName("routine_id") val routineId: String,
    val name: String,
    val goal: String? = null,
    val days: List<String> = emptyList(),
    @SerialName("created_at") val createdAt: String? = null,
    val exercises: List<RoutineExerciseDto> = emptyList(),
)

@Serializable
data class RoutineExerciseDto(
    @SerialName("routine_exercise_id") val id: String,
    val exercise: ExerciseDto? = null,
    val sets: Int? = null,
    val reps: Int? = null,
    @SerialName("rest_seconds") val restSeconds: Int? = null,
    @SerialName("suggested_kg") val suggestedKg: Double? = null,
    val tempo: String? = null,
    val notes: String? = null,
    @SerialName("order_index") val orderIndex: Int = 0,
)

@Serializable
data class ExerciseDto(
    val id: String,
    val name: String,
    @SerialName("muscle_group") val muscleGroup: String? = null,
    val equipment: String? = null,
    @SerialName("video_url") val videoUrl: String? = null,
)
