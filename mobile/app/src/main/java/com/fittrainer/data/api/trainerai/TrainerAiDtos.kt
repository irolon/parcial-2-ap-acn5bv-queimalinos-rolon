package com.fittrainer.data.api.trainerai

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Body de POST /trainer-ai/generate-routine (E15). available_equipment null = no viaja (el backend usa la ficha);
 * injuries no tiene default: viaja siempre (null = sin lesiones). preferences null no viaja.
 */
@Serializable
data class GenerateRoutineRequest(
    @SerialName("student_id") val studentId: String,
    val goal: String,
    val level: String,
    @SerialName("frequency_per_week") val frequencyPerWeek: Int,
    @SerialName("session_duration_min") val sessionDurationMin: Int,
    @SerialName("available_equipment") val availableEquipment: List<String>? = null,
    val injuries: String?,
    val preferences: String? = null,
)

@Serializable
data class GenerateRoutineResponse(val data: GeneratedRoutineDto)

@Serializable
data class GeneratedRoutineDto(
    @SerialName("generation_id") val generationId: String,
    @SerialName("routine_proposal") val proposal: RoutineProposalDto,
)

@Serializable
data class RoutineProposalDto(val routines: List<ProposalBlockDto>, val rationale: String)

@Serializable
data class ProposalBlockDto(val name: String, val days: List<String>, val exercises: List<ProposalExerciseDto>)

@Serializable
data class ProposalExerciseDto(
    @SerialName("exercise_id") val exerciseId: String,
    @SerialName("exercise_name") val exerciseName: String? = null,
    val sets: Int,
    val reps: Int,
    @SerialName("rest_seconds") val restSeconds: Int,
    @SerialName("suggested_kg") val suggestedKg: Double? = null,
    val notes: String? = null,
)

@Serializable
data class SaveAsTemplateRequest(
    @SerialName("generation_id") val generationId: String,
    @SerialName("template_name") val templateName: String,
)

@Serializable
data class SaveAsTemplateResponse(val data: SavedTemplatesDto)

@Serializable
data class SavedTemplatesDto(
    @SerialName("generation_id") val generationId: String,
    val templates: List<SavedTemplateDto>,
)

@Serializable
data class SavedTemplateDto(val id: String, val name: String, val days: List<String> = emptyList())
