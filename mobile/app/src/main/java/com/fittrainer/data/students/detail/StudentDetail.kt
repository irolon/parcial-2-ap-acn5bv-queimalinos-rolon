package com.fittrainer.data.students.detail

import com.fittrainer.data.students.TrainerStudent
import java.time.Instant
import java.time.LocalDate

/** La ficha de un alumno, vista por su entrenador. */
data class StudentDetail(
    val id: String,
    val name: String,
    val email: String,
    val goal: String?,
    val level: String?,
    val birthDate: LocalDate?,
    val active: Boolean,
    val gymEquipment: List<String>,
    val injuries: String?,
    val createdAt: Instant,
    val lastSessionAt: Instant?,
    val latestMetrics: LatestMetrics?,
    val activeRoutine: ActiveRoutine?,
)

/** Última medición; el IMC es el que calcula el backend. */
data class LatestMetrics(
    val weightKg: Double?,
    val heightCm: Double?,
    val bodyFatPct: Double?,
    val bmi: Double?,
    val recordedAt: Instant,
)

data class ActiveRoutine(val name: String, val days: List<String>)

/** Lo que hay en Room y cuándo se bajó. */
data class StudentDetailCache(val detail: StudentDetail, val fetchedAt: Instant)

/** Para reusar las reglas de estado de la lista (E1). */
fun StudentDetail.asListStudent() = TrainerStudent(
    id = id,
    name = name,
    email = email,
    goal = goal,
    active = active,
    createdAt = createdAt,
    lastSessionAt = lastSessionAt,
    daysPerWeek = activeRoutine?.days?.distinct()?.size ?: 0,
    adherence = null,
)
