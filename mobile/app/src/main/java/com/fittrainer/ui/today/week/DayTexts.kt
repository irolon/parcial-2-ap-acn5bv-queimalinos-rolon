package com.fittrainer.ui.today.week

import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.ui.today.dayName
import com.fittrainer.ui.workout.history.volumeText
import java.time.LocalDate

/** Cómo estuvo un día pasado, para la etiqueta del detalle. */
enum class PastDayKind(val label: String) { TRAINED("ENTRENADO"), MISSED("SIN ENTRENAR"), REST("DESCANSO") }


private fun dayAndNumber(date: LocalDate) = "${dayName(date.dayOfWeek).uppercase()} ${date.dayOfMonth}"

/** "MAÑANA · MIÉRCOLES" si es mañana; si no, "JUEVES 20". */
fun nextTrainingLabel(date: LocalDate, today: LocalDate): String =
    if (date == today.plusDays(1)) "MAÑANA · ${dayName(date.dayOfWeek).uppercase()}" else dayAndNumber(date)

/** "48 min · 18 series · 2.340 kg · RPE 7"; lo que falta (o es cero) se omite. */
fun sessionSummary(item: HistoryItem): String = listOfNotNull(
    item.durationMin?.let { "$it min" },
    item.sets.takeIf { it > 0 }?.let { if (it == 1) "1 serie" else "$it series" },
    item.volumeKg.takeIf { it > 0 }?.let { volumeText(it) },
    item.rpe?.let { "RPE $it" },
).joinToString(" · ")

/** "LUNES 16 · ENTRENADO". */
fun pastDayLabel(date: LocalDate, kind: PastDayKind): String = "${dayAndNumber(date)} · ${kind.label}"

/** "JUEVES 19 · TE TOCA". */
fun futureDayLabel(date: LocalDate): String = "${dayAndNumber(date)} · TE TOCA"

/** "JUEVES 19 · DESCANSO". */
fun futureRestLabel(date: LocalDate): String = "${dayAndNumber(date)} · DESCANSO"

fun streakTitle(days: Int): String = if (days == 1) "Racha de 1 día" else "Racha de $days días"

fun exercisesText(n: Int): String = if (n == 1) "1 ejercicio" else "$n ejercicios"

/** "DESPUÉS · SÁBADO 21". */
fun afterLabel(date: LocalDate): String = "DESPUÉS · ${dayAndNumber(date)}"
