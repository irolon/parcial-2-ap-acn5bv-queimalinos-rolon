package com.fittrainer.ui.students

import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.data.students.StudentFilter
import com.fittrainer.data.students.StudentStatus
import com.fittrainer.ui.join.goalLabel
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.ChronoUnit

const val STUDENTS_TITLE = "Alumnos"
const val STUDENTS_SEARCH_HINT = "Buscar alumno…"
const val STUDENTS_EMPTY_TITLE = "Todavía no tenés alumnos"
const val STUDENTS_EMPTY_BODY = "Cuando un alumno acepte tu invitación, va a aparecer acá."
const val STUDENTS_NO_MATCH = "Ningún alumno coincide con el filtro o la búsqueda."
const val STUDENTS_ERROR_TITLE = "No pudimos bajar tus alumnos"
const val STUDENTS_OFFLINE_ERROR = "Sin conexión. Conectate y reintentá."
const val STUDENTS_REFRESH_FAILED = "No pudimos actualizar. Mostrando la última lista"
const val STUDENTS_RETRY = "Reintentar"
const val NO_PLAN = "Sin plan"

/** "Hoy", "Ayer", "Hace N días" o "Nunca entrenó", en días de calendario argentinos. */
fun lastTrainingLabel(lastSessionAt: Instant?, today: LocalDate): String {
    if (lastSessionAt == null) return "Nunca entrenó"
    val days = ChronoUnit.DAYS.between(lastSessionAt.atZone(ARGENTINA).toLocalDate(), today)
    return when {
        days <= 0 -> "Hoy"
        days == 1L -> "Ayer"
        else -> "Hace $days días"
    }
}

/** "4 ACTIVOS · 1 EN RIESGO". */
fun headerCounts(active: Int, atRisk: Int): String =
    "$active ${if (active == 1) "ACTIVO" else "ACTIVOS"} · $atRisk EN RIESGO"

/** "Ganar masa muscular · 4 d", o solo el objetivo si no tiene rutina. */
fun studentSubtitle(goal: String?, daysPerWeek: Int): String =
    if (daysPerWeek > 0) "${goalLabel(goal)} · $daysPerWeek d" else goalLabel(goal)

fun statusLabel(status: StudentStatus): String = when (status) {
    StudentStatus.ACTIVE -> "al día"
    StudentStatus.INACTIVE -> "en riesgo"
    StudentStatus.NEW -> "nuevo"
    StudentStatus.DISABLED -> "de baja"
}

fun filterLabel(filter: StudentFilter): String = when (filter) {
    StudentFilter.ALL -> "Todos"
    StudentFilter.ACTIVE -> "Al día"
    StudentFilter.AT_RISK -> "En riesgo"
    StudentFilter.NEW -> "Nuevos"
    StudentFilter.DISABLED -> "Dados de baja"
}

/** "Actualizado hace un momento / 5 min / 2 h / 3 días". */
fun syncedAgo(lastSyncedAt: Instant, now: Instant): String {
    val minutes = Duration.between(lastSyncedAt, now).toMinutes().coerceAtLeast(0)
    val ago = when {
        minutes < 1 -> "un momento"
        minutes < 60 -> "$minutes min"
        minutes < 24 * 60 -> "${minutes / 60} h"
        minutes / (24 * 60) == 1L -> "1 día"
        else -> "${minutes / (24 * 60)} días"
    }
    return "Actualizado hace $ago"
}

/** Iniciales del avatar: primera letra de las dos primeras palabras ("José Pérez" → "JP"). */
fun initials(name: String): String =
    name.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }.take(2)
        .joinToString("") { it.first().uppercase() }
        .ifEmpty { "?" }
