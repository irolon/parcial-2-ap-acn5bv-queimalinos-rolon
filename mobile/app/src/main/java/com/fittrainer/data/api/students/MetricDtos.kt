package com.fittrainer.data.api.students

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Una medida de GET/POST /students/:id/metrics. bmi lo calcula el backend (puede venir null). */
@Serializable
data class MetricDto(
    val id: String,
    @SerialName("weight_kg") val weightKg: Double? = null,
    @SerialName("height_cm") val heightCm: Double? = null,
    @SerialName("body_fat_pct") val bodyFatPct: Double? = null,
    @SerialName("waist_cm") val waistCm: Double? = null,
    @SerialName("hip_cm") val hipCm: Double? = null,
    @SerialName("chest_cm") val chestCm: Double? = null,
    @SerialName("recorded_at") val recordedAt: String,
    @SerialName("recorded_by") val recordedBy: String? = null,
    val bmi: Double? = null,
)

@Serializable
data class MetricsResponse(val data: List<MetricDto> = emptyList())

@Serializable
data class MetricResponse(val data: MetricDto)

/**
 * POST /students/:id/metrics. Los null tienen valor por defecto y no se mandan (el Json de la app no
 * codifica los valores por defecto): el backend los toma como ausentes. id lo genera el cliente: un
 * reintento con el mismo id no duplica la medida.
 */
@Serializable
data class CreateMetricRequest(
    val id: String,
    @SerialName("recorded_at") val recordedAt: String,
    @SerialName("weight_kg") val weightKg: Double? = null,
    @SerialName("height_cm") val heightCm: Double? = null,
    @SerialName("body_fat_pct") val bodyFatPct: Double? = null,
    @SerialName("waist_cm") val waistCm: Double? = null,
    @SerialName("hip_cm") val hipCm: Double? = null,
    @SerialName("chest_cm") val chestCm: Double? = null,
)
