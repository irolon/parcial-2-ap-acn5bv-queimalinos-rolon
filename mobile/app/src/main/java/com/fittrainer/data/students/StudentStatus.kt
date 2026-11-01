package com.fittrainer.data.students

import java.text.Normalizer
import java.time.LocalDate
import java.time.temporal.ChronoUnit

/** Estados de la web (frontend/src/utils/students/activity.js). */
enum class StudentStatus { ACTIVE, INACTIVE, NEW, DISABLED }

/** Filtros de la lista. ALL = todos menos los dados de baja; NEW = nunca entrenó (cualquier antigüedad). */
enum class StudentFilter { ALL, ACTIVE, AT_RISK, NEW, DISABLED }

/** Días sin entrenar desde los que un alumno está "en riesgo". */
const val INACTIVE_DAYS = 7

/** Días de calendario (Argentina) desde la última sesión o, si nunca entrenó, desde el alta. */
fun TrainerStudent.daysWithoutTraining(today: LocalDate): Int {
    val since = (lastSessionAt ?: createdAt).atZone(ARGENTINA).toLocalDate()
    return ChronoUnit.DAYS.between(since, today).toInt().coerceAtLeast(0)
}

fun TrainerStudent.status(today: LocalDate): StudentStatus = when {
    !active -> StudentStatus.DISABLED
    daysWithoutTraining(today) >= INACTIVE_DAYS -> StudentStatus.INACTIVE
    lastSessionAt == null -> StudentStatus.NEW
    else -> StudentStatus.ACTIVE
}

fun TrainerStudent.matches(filter: StudentFilter, today: LocalDate): Boolean = when (filter) {
    StudentFilter.ALL -> active
    StudentFilter.ACTIVE -> status(today) == StudentStatus.ACTIVE
    StudentFilter.AT_RISK -> status(today) == StudentStatus.INACTIVE
    StudentFilter.NEW -> active && lastSessionAt == null
    StudentFilter.DISABLED -> !active
}

/** Búsqueda por nombre sin distinguir mayúsculas ni tildes ("jose" encuentra "José"). */
fun TrainerStudent.matchesQuery(q: String): Boolean {
    val query = q.trim().fold()
    return query.isEmpty() || name.fold().contains(query)
}

private val DIACRITICS = Regex("\\p{Mn}+")

private fun String.fold(): String = DIACRITICS.replace(Normalizer.normalize(this, Normalizer.Form.NFD), "").lowercase()
