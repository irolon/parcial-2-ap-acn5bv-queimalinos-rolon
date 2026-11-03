package com.fittrainer.data.api.templates

import com.fittrainer.data.api.ExerciseDto
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TemplateListResponse(val data: List<TemplateSummaryDto> = emptyList())

@Serializable
data class TemplateSummaryDto(
    val id: String,
    val name: String,
    val goal: String? = null,
    val level: String? = null,
    val days: List<String> = emptyList(),
    @SerialName("exercise_count") val exerciseCount: Int = 0,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class TemplateDetailResponse(val data: TemplateDetailDto)

@Serializable
data class TemplateDetailDto(
    val id: String,
    val name: String,
    val goal: String? = null,
    val level: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    val structure: TemplateStructureDto = TemplateStructureDto(),
)

@Serializable
data class TemplateStructureDto(
    val days: List<String> = emptyList(),
    val exercises: List<TemplateExerciseDto> = emptyList(),
)

/** Un ejercicio de la structure. exercise: sus datos, o null si ya no existe. */
@Serializable
data class TemplateExerciseDto(
    @SerialName("exercise_id") val exerciseId: String,
    val sets: Int? = null,
    val reps: Int? = null,
    @SerialName("rest_seconds") val restSeconds: Int? = null,
    @SerialName("suggested_kg") val suggestedKg: Double? = null,
    val tempo: String? = null,
    val notes: String? = null,
    val order: Int = 0,
    val exercise: ExerciseDto? = null,
)

@Serializable
data class InstantiateRequest(
    @SerialName("student_id") val studentId: String,
    val name: String,
    val days: List<String>,
)

@Serializable
data class FromRoutineRequest(
    @SerialName("routine_id") val routineId: String,
    val name: String,
    val level: String? = null,
)
