package com.fittrainer.ui.challenges.trainer

import com.fittrainer.data.challenges.trainer.BatchAssignResult
import com.fittrainer.data.challenges.trainer.GOAL_SESSIONS
import com.fittrainer.data.challenges.trainer.GOAL_STREAK
import com.fittrainer.data.challenges.trainer.GOAL_VOLUME
import com.fittrainer.data.challenges.trainer.GOAL_WEIGHT
import com.fittrainer.data.challenges.trainer.STATUS_ABANDONED
import com.fittrainer.data.challenges.trainer.STATUS_ACTIVE
import com.fittrainer.data.challenges.trainer.STATUS_COMPLETED
import com.fittrainer.data.challenges.trainer.STATUS_FAILED
import com.fittrainer.data.challenges.trainer.StudentChallenge
import java.time.Instant
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import kotlin.math.abs
import kotlin.math.roundToLong

const val CHALLENGES_TITLE = "Desafíos"
const val CHALLENGES_SECTION = "DESAFÍOS"
const val CHALLENGES_EMPTY = "No hay desafíos disponibles."
const val CHALLENGES_NOT_LOADED = "Todavía no se bajaron los desafíos. Conectate para verlos."
const val CHALLENGES_REFRESH_FAILED = "No pudimos actualizar los desafíos"
const val CHALLENGE_NOT_LOADED = "Conectate para ver el desafío"
const val CHALLENGE_GONE = "El desafío ya no existe"
const val CHALLENGE_OWN = "PROPIO"
const val CHALLENGE_REWARD = "Al cumplirlo, el alumno gana un logro."
const val ASSIGN_TO_STUDENTS = "Asignar a alumnos"
const val PICK_STUDENTS = "Elegí los alumnos"
const val ASSIGN_CHALLENGE = "Asignar desafío"
const val PICK_CHALLENGE = "Elegí un desafío"
const val ALREADY_ACTIVE = "Ya tiene este desafío activo"
const val ASSIGNED_ONE = "Desafío asignado"
const val STUDENT_CHALLENGES_EMPTY = "Todavía no tiene desafíos."
const val STUDENT_CHALLENGES_NOT_LOADED = "Todavía no se bajaron sus desafíos. Conectate para verlos."
const val STUDENT_CHALLENGES_FAILED = "No pudimos actualizar sus desafíos"
const val NO_ACTIVE_STUDENTS = "No tenés alumnos activos"
const val STUDENTS_LOADING = "Bajando tus alumnos…"
const val STUDENTS_FAILED = "No pudimos bajar tus alumnos"
const val NEEDS_NETWORK = "Necesitás conexión para asignar"
const val ASSIGN_FAILED = "No pudimos asignar el desafío. Probá de nuevo."

/** Tope de alumnos por POST (validateBatchAssign del backend). */
const val MAX_BATCH = 50
const val TOO_MANY = "Elegí hasta $MAX_BATCH alumnos por vez"

private val MONTHS = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")

/** Enteros con punto de miles ("10.000"); con decimales, uno y con coma ("80,5"). */
fun amount(value: Double): String {
    if (abs(value - value.roundToLong()) < 0.05) return value.roundToLong().toString().reversed().chunked(3).joinToString(".").reversed()
    return ((value * 10).roundToLong() / 10.0).toString().replace('.', ',')
}

private fun days(n: Int) = if (n == 1) "1 día" else "$n días"

/** La meta: "12 sesiones · 30 días", "Llegar a 75 kg · 60 días". */
fun goalLine(goalType: String, goalValue: Double, durationDays: Int?): String {
    val goal = when (goalType) {
        GOAL_SESSIONS -> if (goalValue == 1.0) "1 sesión" else "${amount(goalValue)} sesiones"
        GOAL_STREAK -> "${amount(goalValue)} días de racha"
        GOAL_VOLUME -> "${amount(goalValue)} kg de volumen"
        GOAL_WEIGHT -> "Llegar a ${amount(goalValue)} kg"
        else -> amount(goalValue)
    }
    return listOfNotNull(goal, durationDays?.let(::days)).joinToString(" · ")
}

/** El avance: "5 de 12 sesiones"; en peso, "Peso actual 80 kg · meta 75 kg". */
fun progressLabel(goalType: String, current: Double, goal: Double): String = when (goalType) {
    GOAL_SESSIONS -> "${amount(current)} de ${amount(goal)} sesiones"
    GOAL_STREAK -> "${amount(current)} de ${amount(goal)} días de racha"
    GOAL_VOLUME -> "${amount(current)} de ${amount(goal)} kg de volumen"
    GOAL_WEIGHT -> "Peso actual ${amount(current)} kg · meta ${amount(goal)} kg"
    else -> "${amount(current)} de ${amount(goal)}"
}

fun statusLabel(status: String): String = when (status) {
    STATUS_ACTIVE -> "Activo"
    STATUS_COMPLETED -> "Cumplido"
    STATUS_FAILED -> "Vencido"
    STATUS_ABANDONED -> "Abandonado"
    else -> status
}

private fun shortDate(at: Instant, zone: ZoneId) = at.atZone(zone).toLocalDate().let { "${it.dayOfMonth} ${MONTHS[it.monthValue - 1]}" }

/** Activo: "Quedan N días" (por día calendario). Cumplido: "Cumplido el 12 nov". Si no: "Terminó el 12 nov". */
fun timeLabel(item: StudentChallenge, now: Instant, zone: ZoneId): String = when (item.status) {
    STATUS_ACTIVE -> when (val left = ChronoUnit.DAYS.between(now.atZone(zone).toLocalDate(), item.endsAt.atZone(zone).toLocalDate())) {
        in Long.MIN_VALUE..0L -> "Termina hoy"
        1L -> "Queda 1 día"
        else -> "Quedan $left días"
    }
    STATUS_COMPLETED -> "Cumplido el ${shortDate(item.completedAt ?: item.endsAt, zone)}"
    else -> "Terminó el ${shortDate(item.endsAt, zone)}"
}

/** La barra: de 0 a 1. */
fun progressFraction(pct: Double): Float = (pct / 100).coerceIn(0.0, 1.0).toFloat()

/** El resultado de asignar a varios, una línea por grupo. Nunca dice "Asignado a 0". */
fun batchSummary(result: BatchAssignResult, nameOf: (String) -> String): String = listOfNotNull(
    result.created.size.takeIf { it > 0 }?.let { if (it == 1) "Asignado a 1 alumno" else "Asignado a $it alumnos" },
    result.alreadyActive.takeIf { it.isNotEmpty() }?.let { ids -> "Ya lo tenían activo: ${ids.joinToString(", ") { nameOf(it) }}" },
    result.notYours.takeIf { it.isNotEmpty() }?.let { ids -> "Ya no están en tu lista: ${ids.joinToString(", ") { nameOf(it) }}" },
).joinToString("\n")

fun assignButton(count: Int) = if (count == 0) "Asignar" else "Asignar ($count)"
