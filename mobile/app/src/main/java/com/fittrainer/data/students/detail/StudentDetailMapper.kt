package com.fittrainer.data.students.detail

import com.fittrainer.data.api.students.StudentDetailDto
import com.fittrainer.data.db.students.TrainerStudentDetailEntity
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import kotlinx.serialization.json.Json

private val json = Json { ignoreUnknownKeys = true }

private fun parseInstant(iso: String): Instant = OffsetDateTime.parse(iso).toInstant()

fun StudentDetailDto.toEntity(trainerId: String, fetchedAt: Long) = TrainerStudentDetailEntity(
    trainerId = trainerId,
    id = id,
    name = name,
    email = email,
    goal = goal?.takeIf { it.isNotBlank() },
    level = level?.takeIf { it.isNotBlank() },
    birthDate = birthDate?.takeIf { it.isNotBlank() },
    active = active,
    gymEquipmentJson = json.encodeToString(gymEquipment.orEmpty()),
    injuries = injuries?.takeIf { it.isNotBlank() },
    createdAt = parseInstant(createdAt).toEpochMilli(),
    lastSessionAt = lastSessionAt?.let { parseInstant(it).toEpochMilli() },
    metricWeightKg = latestMetrics?.weightKg,
    metricHeightCm = latestMetrics?.heightCm,
    metricBodyFatPct = latestMetrics?.bodyFatPct,
    metricBmi = latestMetrics?.bmi,
    metricRecordedAt = latestMetrics?.let { parseInstant(it.recordedAt).toEpochMilli() },
    activeRoutineName = activeRoutine?.name,
    activeRoutineDays = activeRoutine?.days?.joinToString(","),
    fetchedAt = fetchedAt,
)

fun TrainerStudentDetailEntity.toDomain() = StudentDetail(
    id = id,
    name = name,
    email = email,
    goal = goal,
    level = level,
    birthDate = birthDate?.let { runCatching { LocalDate.parse(it) }.getOrNull() },
    active = active,
    gymEquipment = runCatching { json.decodeFromString<List<String>>(gymEquipmentJson) }.getOrDefault(emptyList()),
    injuries = injuries,
    createdAt = Instant.ofEpochMilli(createdAt),
    lastSessionAt = lastSessionAt?.let(Instant::ofEpochMilli),
    latestMetrics = metricRecordedAt?.let {
        LatestMetrics(metricWeightKg, metricHeightCm, metricBodyFatPct, metricBmi, Instant.ofEpochMilli(it))
    },
    activeRoutine = activeRoutineName?.let { name ->
        ActiveRoutine(name, activeRoutineDays.orEmpty().split(",").filter { it.isNotBlank() })
    },
)
