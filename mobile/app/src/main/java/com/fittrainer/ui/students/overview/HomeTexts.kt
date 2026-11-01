package com.fittrainer.ui.students.overview

import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.data.students.overview.FeedbackItem
import com.fittrainer.data.students.overview.RiskItem
import com.fittrainer.data.students.overview.StudentItem
import com.fittrainer.data.students.overview.StudentStatus
import com.fittrainer.data.students.overview.TodayItem
import com.fittrainer.data.students.overview.TrainerOverview
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.time.temporal.ChronoUnit
import java.util.Locale

const val HOME_INVITE_TITLE = "Invitá a tu primer alumno"
const val HOME_INVITE_BODY = "Cuando tengas alumnos, acá vas a ver cómo vienen y a quién atender."
const val HOME_ERROR_TITLE = "No pudimos cargar el inicio"
const val HOME_REFRESH_FAILED = "No pudimos actualizar. Mostrando el último resumen"
const val HOME_DAY_LABEL = "PLAN DE HOY"
const val HOME_BELL = "Pendientes de hoy"
const val HOME_BELL_EMPTY = "Nadie te debe el entrenamiento de hoy."

/** Los filtros de la lista del Inicio, en el orden de la fila. */
enum class HomeFilter(val label: String, val empty: String) {
    TODAY("HOY", "Hoy no le toca entrenar a nadie."),
    RISK("RIESGO", "Nadie lleva 7 días sin entrenar."),
    FEEDBACK("FEEDBACK", "Comentaste todas las sesiones de la semana."),
    STUDENTS("ACTIVOS", "Todavía no tenés alumnos activos."),
}

/** El número de cada filtro. */
fun filterCount(o: TrainerOverview, filter: HomeFilter): Int = when (filter) {
    HomeFilter.TODAY -> o.today.size
    HomeFilter.RISK -> o.atRisk.size
    HomeFilter.FEEDBACK -> o.feedback.size
    HomeFilter.STUDENTS -> o.activeStudents
}

/** La línea de contexto de cada filtro: "1 pendiente", "+7 días sin entrenar", "sin comentar", "58% adherencia". */
fun filterCaption(o: TrainerOverview, filter: HomeFilter): String = when (filter) {
    HomeFilter.TODAY -> o.missingToday.size.let { if (it == 1) "1 pendiente" else "$it pendientes" }
    HomeFilter.RISK -> "+7 días sin entrenar"
    HomeFilter.FEEDBACK -> "sesiones sin comentar"
    HomeFilter.STUDENTS -> o.adherencePct?.let { "$it% adherencia" } ?: "sin plan asignado"
}

private val SPANISH = Locale.forLanguageTag("es-AR")
private val SHORT_DATE = DateTimeFormatter.ofPattern("dd/MM")
private val HOUR = DateTimeFormatter.ofPattern("HH:mm")

/** "DOMINGO · 1 NOV". */
fun headerDate(today: LocalDate): String {
    val day = today.dayOfWeek.getDisplayName(TextStyle.FULL, SPANISH).uppercase(SPANISH)
    val month = today.month.getDisplayName(TextStyle.SHORT, SPANISH).trimEnd('.').uppercase(SPANISH)
    return "$day · ${today.dayOfMonth} $month"
}

/** "Hola, Profe" (primer nombre). */
fun greeting(name: String): String = "Hola, ${name.trim().substringBefore(' ')}"

/** Título de la tarjeta del día: cuántos faltan, todos listos o nada planificado. */
fun dayTitle(o: TrainerOverview): String {
    val missing = o.missingToday.size
    return when {
        o.plannedToday == 0 -> "Hoy no hay entrenamientos planificados"
        missing == 0 -> "Todos entrenaron hoy"
        missing == 1 -> "Falta 1 alumno"
        else -> "Faltan $missing alumnos"
    }
}

/** "José Martínez", "José Martínez y 2 más", o el resumen cuando no falta nadie. */
fun daySubtitle(o: TrainerOverview): String {
    val missing = o.missingToday
    return when {
        o.plannedToday == 0 -> "Si alguien entrena igual, aparece en Hoy"
        missing.isEmpty() -> "${o.plannedDone} de ${o.plannedToday} terminaron su sesión"
        missing.size == 1 -> missing.first().name
        else -> "${missing.first().name} y ${missing.size - 1} más"
    }
}

/** "Terminó 10:45 · Push · RPE 8" o "Le toca hoy · todavía no entrenó". */
fun todayLine(item: TodayItem): String {
    val finished = item.finishedAt ?: return "Le toca hoy · todavía no entrenó"
    val parts = listOfNotNull("Terminó ${finished.atZone(ARGENTINA).format(HOUR)}", item.routineName, item.rpe?.let { "RPE $it" })
    return parts.joinToString(" · ")
}

/** "9 días sin entrenar" o "Nunca entrenó · alta hace 8 días". */
fun riskLine(item: RiskItem): String =
    if (item.neverTrained) "Nunca entrenó · alta hace ${item.days} días" else "${item.days} días sin entrenar"

/** "Push · RPE 8 · ayer" ("Sin rutina" si no tiene). */
fun feedbackLine(item: FeedbackItem, now: Instant): String =
    listOfNotNull(item.routineName ?: "Sin rutina", item.rpe?.let { "RPE $it" }, relativeTime(item.finishedAt, now)).joinToString(" · ")

/** "Entrenó hoy", "Entrenó hace 3 días", "Nuevo · todavía no entrenó" o "9 días sin entrenar". */
fun studentLine(item: StudentItem): String = when {
    item.status == StudentStatus.NEW -> "Nuevo · todavía no entrenó"
    item.status == StudentStatus.INACTIVE -> "${item.daysWithoutTraining} días sin entrenar"
    item.daysWithoutTraining == 0 -> "Entrenó hoy"
    item.daysWithoutTraining == 1 -> "Entrenó ayer"
    else -> "Entrenó hace ${item.daysWithoutTraining} días"
}

/** "Adherencia promedio 58% · +48% vs. semana anterior" (o sin la variación); null si nadie tiene plan. */
fun adherenceSummary(pct: Int?, delta: Int?): String? {
    pct ?: return null
    val change = deltaLabel(delta).takeIf { it.isNotEmpty() }?.let { " · $it vs. semana anterior" }.orEmpty()
    return "Adherencia promedio $pct%$change"
}

/** "+4%" / "−3%" / "0%"; sin variación (null): "". */
fun deltaLabel(delta: Int?): String = when {
    delta == null -> ""
    delta > 0 -> "+$delta%"
    delta < 0 -> "−${-delta}%"
    else -> "0%"
}

/** "87%" o "sin plan". */
fun pctLabel(pct: Int?): String = pct?.let { "$it%" } ?: "sin plan"

/** "hace un momento", "hace 12 min", "hace 1 h" (mismo día), "ayer" o "28/10", en días argentinos. */
fun relativeTime(at: Instant, now: Instant): String {
    val minutes = Duration.between(at, now).toMinutes().coerceAtLeast(0)
    val days = ChronoUnit.DAYS.between(at.atZone(ARGENTINA).toLocalDate(), now.atZone(ARGENTINA).toLocalDate())
    return when {
        minutes < 1 -> "hace un momento"
        minutes < 60 -> "hace $minutes min"
        days == 0L -> "hace ${minutes / 60} h"
        days == 1L -> "ayer"
        else -> at.atZone(ARGENTINA).format(SHORT_DATE)
    }
}
