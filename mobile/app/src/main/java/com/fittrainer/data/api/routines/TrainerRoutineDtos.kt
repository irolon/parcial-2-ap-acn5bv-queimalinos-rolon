package com.fittrainer.data.api.routines

import com.fittrainer.data.api.RoutineExerciseDto
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TrainerRoutineListResponse(val data: List<TrainerRoutineSummaryDto> = emptyList())

@Serializable
data class TrainerRoutineSummaryResponse(val data: TrainerRoutineSummaryDto)

@Serializable
data class TrainerRoutineSummaryDto(
    val id: String,
    @SerialName("student_id") val studentId: String,
    val name: String,
    val goal: String? = null,
    val days: List<String> = emptyList(),
    val active: Boolean = true,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class TrainerRoutineDetailResponse(val data: TrainerRoutineDetailDto)

@Serializable
data class TrainerRoutineDetailDto(
    val id: String,
    @SerialName("student_id") val studentId: String,
    val name: String,
    val goal: String? = null,
    val days: List<String> = emptyList(),
    val active: Boolean = true,
    @SerialName("created_at") val createdAt: String? = null,
    val exercises: List<RoutineExerciseDto> = emptyList(),
)

@Serializable
data class CreatedRoutineResponse(val data: CreatedRoutineDto)

/** POST /routines devuelve la fila con los ejercicios crudos: solo interesa el id. */
@Serializable
data class CreatedRoutineDto(val id: String)

@Serializable
data class CreateRoutineRequest(
    @SerialName("student_id") val studentId: String,
    val name: String,
    val goal: String,
    val days: List<String>,
    val exercises: List<NewRoutineExerciseDto>,
)

@Serializable
data class NewRoutineExerciseDto(
    @SerialName("exercise_id") val exerciseId: String,
    val sets: Int,
    val reps: Int,
    @SerialName("rest_seconds") val restSeconds: Int? = null,
    @SerialName("suggested_kg") val suggestedKg: Double? = null,
    val tempo: String? = null,
    val notes: String? = null,
    val order: Int,
)

@Serializable
data class AddExercisesRequest(val exercises: List<NewRoutineExerciseDto>)

@Serializable
data class ReorderRequest(@SerialName("routine_exercise_ids") val routineExerciseIds: List<String>)
