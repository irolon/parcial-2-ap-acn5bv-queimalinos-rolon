package com.fittrainer.ui.students.overview

import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.data.students.overview.AttentionItem
import com.fittrainer.data.students.overview.RecentItem
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
const val HOME_ATTENTION = "REQUIEREN ATENCIÓN"
const val HOME_RECENT = "ACTIVIDAD RECIENTE"
const val HOME_ALL_GOOD = "Nadie necesita atención por ahora."
const val HOME_NO_ACTIVITY = "Todavía no hay sesiones terminadas."

private val SPANISH = Locale.forLanguageTag("es-AR")
private val SHORT_DATE = DateTimeFormatter.ofPattern("dd/MM")

/** "DOMINGO · 1 NOV". */
fun headerDate(today: LocalDate): String {
    val day = today.dayOfWeek.getDisplayName(TextStyle.FULL, SPANISH).uppercase(SPANISH)
    val month = today.month.getDisplayName(TextStyle.SHORT, SPANISH).trimEnd('.').uppercase(SPANISH)
    return "$day · ${today.dayOfMonth} $month"
}

/** "Hola, Profe" (primer nombre). */
fun greeting(name: String): String = "Hola, ${name.trim().substringBefore(' ')}"

/** "+2" (o "" si no hubo altas). */
fun newLabel(new7d: Int): String = if (new7d > 0) "+$new7d" else ""

/** "de 11". */
fun expectedLabel(expected: Int): String = "de $expected"

/** "+4%" / "−3%" / "0%"; sin variación (null): "". */
fun deltaLabel(delta: Int?): String = when {
    delta == null -> ""
    delta > 0 -> "+$delta%"
    delta < 0 -> "−${-delta}%"
    else -> "0%"
}

/** "87%" o "—" si nadie tiene plan. */
fun pctLabel(pct: Int?): String = pct?.let { "$it%" } ?: "—"

/** "9 días sin entrenar", "Nunca entrenó · alta hace 8 días" o "Feedback pendiente · Push". */
fun attentionLine(item: AttentionItem): String = when (item) {
    is AttentionItem.AtRisk -> if (item.neverTrained) "Nunca entrenó · alta hace ${item.days} días" else "${item.days} días sin entrenar"
    is AttentionItem.FeedbackPending -> "Feedback pendiente · ${item.routineName ?: "Sin rutina"}"
}

/** "Push día 3 · RPE 8", solo la rutina si no hay RPE, y "Sin rutina" si no tiene. */
fun recentLine(item: RecentItem): String {
    val routine = item.routineName ?: "Sin rutina"
    return item.rpe?.let { "$routine · RPE $it" } ?: routine
}

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
