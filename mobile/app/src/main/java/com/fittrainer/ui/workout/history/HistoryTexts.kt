package com.fittrainer.ui.workout.history

import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.data.workout.history.HistorySet
import com.fittrainer.ui.workout.kgNumber
import java.text.NumberFormat
import java.time.Instant
import java.time.ZoneId
import java.util.Locale

private val DAYS = listOf("Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom")
private val MONTHS = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")
private val AR = Locale.Builder().setLanguage("es").setRegion("AR").build()

/** "Jue 29 oct" en la zona del celular. */
fun historyDate(at: Instant, zone: ZoneId): String {
    val d = at.atZone(zone)
    return "${DAYS[d.dayOfWeek.value - 1]} ${d.dayOfMonth} ${MONTHS[d.monthValue - 1]}"
}

/** 4210.5 → "4.210,5 kg". */
fun volumeText(kg: Double): String =
    NumberFormat.getNumberInstance(AR).apply { maximumFractionDigits = 1 }.format(kg) + " kg"

/** "54 min · 18 series · 4.210 kg"; sin duración (sesión sin cerrar) se omite. */
fun historyLine(durationMin: Int?, sets: Int, volumeKg: Double): String = listOfNotNull(
    durationMin?.let { "$it min" },
    if (sets == 1) "1 serie" else "$sets series",
    volumeText(volumeKg),
).joinToString(" · ")

/** "S1 · 62,5 kg × 10"; sin kg (o 0, peso corporal): "S1 · 10 reps". */
fun setLine(set: HistorySet): String {
    val reps = set.reps ?: 0
    val kg = set.kg?.takeIf { it > 0 }
    return if (kg == null) "S${set.setNumber} · $reps reps" else "S${set.setNumber} · ${kgNumber(kg)} kg × $reps"
}

/** "Plan: 4 × 10 · 60 kg", con lo que haya; null si no hay plan. */
fun planLine(sets: Int?, reps: Int?, kg: Double?): String? {
    val base = when {
        sets != null && reps != null -> "$sets × $reps"
        sets != null -> "$sets series"
        reps != null -> "$reps reps"
        else -> null
    }
    val load = kg?.takeIf { it > 0 }?.let { "${kgNumber(it)} kg" }
    val text = listOfNotNull(base, load).joinToString(" · ")
    return text.takeIf { it.isNotEmpty() }?.let { "Plan: $it" }
}

/** Número del badge de Progreso: de 10 para arriba, "9+". */
fun unreadBadgeText(count: Int): String = if (count > 9) "9+" else count.toString()

/** "45 min", "2 h 40 min", "2 h". */
fun durationText(minutes: Int): String = when {
    minutes < 60 -> "$minutes min"
    minutes % 60 == 0 -> "${minutes / 60} h"
    else -> "${minutes / 60} h ${minutes % 60} min"
}

/** Resumen de la semana con las sesiones de esa semana; la duración se omite si ninguna la tiene. */
fun weekSummaryText(week: List<HistoryItem>): String {
    if (week.isEmpty()) return "Esta semana todavía no entrenaste"
    val minutes = week.mapNotNull { it.durationMin }.takeIf { it.isNotEmpty() }?.sum()
    val count = if (week.size == 1) "1 entrenamiento" else "${week.size} entrenamientos"
    return "Esta semana: " + listOfNotNull(count, minutes?.let(::durationText), volumeText(week.sumOf { it.volumeKg })).joinToString(" · ")
}
