package com.fittrainer.data.api.history

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** GET /students/:id/sessions y su detalle (contratos-api.md). Nulos según "Campos que pueden ser null". */
@Serializable
data class NamedRefDto(val id: String, val name: String)

@Serializable
data class HistorySummaryDto(
    val id: String,
    @SerialName("started_at") val startedAt: String,
    @SerialName("finished_at") val finishedAt: String? = null,
    @SerialName("duration_min") val durationMin: Int? = null,
    val routine: NamedRefDto? = null,
    val rpe: Int? = null,
    val notes: String? = null,
    @SerialName("trainer_comment") val trainerComment: String? = null,
    @SerialName("has_modifications") val hasModifications: Boolean = false,
    val sets: Int = 0,
    @SerialName("volume_kg") val volumeKg: Double = 0.0,
    @SerialName("has_pr") val hasPr: Boolean = false,
)

@Serializable
data class HistoryMetaDto(val total: Int, val page: Int, val limit: Int, @SerialName("total_pages") val totalPages: Int)

@Serializable
data class HistoryPageDto(val data: List<HistorySummaryDto>, val meta: HistoryMetaDto)

@Serializable
data class PlannedDto(val sets: Int? = null, val reps: Int? = null, @SerialName("suggested_kg") val suggestedKg: Double? = null)

@Serializable
data class HistorySetDto(
    val id: String,
    @SerialName("set_number") val setNumber: Int,
    @SerialName("actual_reps") val actualReps: Int? = null,
    @SerialName("actual_kg") val actualKg: Double? = null,
    @SerialName("executed_at") val executedAt: String,
)

@Serializable
data class HistoryExerciseDto(
    val exercise: NamedRefDto,
    @SerialName("original_exercise") val originalExercise: NamedRefDto? = null,
    val planned: PlannedDto? = null,
    @SerialName("is_pr") val isPr: Boolean = false,
    val sets: List<HistorySetDto> = emptyList(),
)

@Serializable
data class HistoryDetailDto(
    val id: String,
    @SerialName("started_at") val startedAt: String,
    @SerialName("finished_at") val finishedAt: String? = null,
    @SerialName("duration_min") val durationMin: Int? = null,
    val routine: NamedRefDto? = null,
    val rpe: Int? = null,
    val notes: String? = null,
    @SerialName("trainer_comment") val trainerComment: String? = null,
    @SerialName("has_modifications") val hasModifications: Boolean = false,
    val sets: Int = 0,
    @SerialName("volume_kg") val volumeKg: Double = 0.0,
    @SerialName("has_pr") val hasPr: Boolean = false,
    val exercises: List<HistoryExerciseDto> = emptyList(),
)

@Serializable
data class HistoryDetailResponse(val data: HistoryDetailDto)
