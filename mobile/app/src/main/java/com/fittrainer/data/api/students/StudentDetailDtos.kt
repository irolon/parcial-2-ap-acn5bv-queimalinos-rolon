package com.fittrainer.data.api.students

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class StudentDetailResponse(val data: StudentDetailDto)

/** Ficha de GET/PATCH /students/:id. latest_metrics, active_routine y last_session_at pueden venir en null. */
@Serializable
data class StudentDetailDto(
    val id: String,
    val name: String,
    val email: String,
    val goal: String? = null,
    val level: String? = null,
    @SerialName("birth_date") val birthDate: String? = null,
    val active: Boolean = true,
    @SerialName("gym_equipment") val gymEquipment: List<String>? = null,
    val injuries: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("last_session_at") val lastSessionAt: String? = null,
    @SerialName("latest_metrics") val latestMetrics: LatestMetricsDto? = null,
    @SerialName("active_routine") val activeRoutine: ActiveRoutineDto? = null,
)

@Serializable
data class LatestMetricsDto(
    @SerialName("weight_kg") val weightKg: Double? = null,
    @SerialName("height_cm") val heightCm: Double? = null,
    @SerialName("body_fat_pct") val bodyFatPct: Double? = null,
    val bmi: Double? = null,
    @SerialName("recorded_at") val recordedAt: String,
)

@Serializable
data class ActiveRoutineDto(val id: String, val name: String, val days: List<String> = emptyList())
