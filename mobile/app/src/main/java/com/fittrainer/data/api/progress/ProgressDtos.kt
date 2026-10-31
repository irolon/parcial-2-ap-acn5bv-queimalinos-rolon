package com.fittrainer.data.api.progress

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** GET /progress/exercise/:id y /progress/body/:studentId (spec del backend §3.1 y §3.2). `summary` y `muscle_group` se ignoran. */
@Serializable
data class ExerciseRefDto(val id: String, val name: String)

@Serializable
data class ExercisePointDto(
    val date: String,
    @SerialName("max_kg") val maxKg: Double? = null,
    @SerialName("volume_kg") val volumeKg: Double? = null,
    @SerialName("e1rm_kg") val e1rmKg: Double? = null,
    val sets: Int = 0,
    val reps: Int = 0,
)

@Serializable
data class PrValueDto(val value: Double, val date: String)

@Serializable
data class PrDto(
    @SerialName("max_kg") val maxKg: PrValueDto? = null,
    @SerialName("e1rm_kg") val e1rmKg: PrValueDto? = null,
)

@Serializable
data class ExerciseProgressDto(
    val exercise: ExerciseRefDto,
    val points: List<ExercisePointDto> = emptyList(),
    val pr: PrDto = PrDto(),
    @SerialName("default_metric") val defaultMetric: String,
)

@Serializable
data class ExerciseProgressResponse(val data: ExerciseProgressDto)

@Serializable
data class BodyPointDto(
    val id: String,
    @SerialName("recorded_at") val recordedAt: String,
    @SerialName("weight_kg") val weightKg: Double? = null,
    @SerialName("height_cm") val heightCm: Double? = null,
    @SerialName("body_fat_pct") val bodyFatPct: Double? = null,
    @SerialName("waist_cm") val waistCm: Double? = null,
    @SerialName("hip_cm") val hipCm: Double? = null,
    @SerialName("chest_cm") val chestCm: Double? = null,
    val bmi: Double? = null,
)

@Serializable
data class BodyProgressDto(val points: List<BodyPointDto> = emptyList())

@Serializable
data class BodyProgressResponse(val data: BodyProgressDto)
