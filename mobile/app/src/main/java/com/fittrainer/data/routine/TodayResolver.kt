package com.fittrainer.data.routine

import java.time.DayOfWeek
import java.time.LocalDate

/**
 * Qué toca hoy, con la misma regla que el backend en /routines/today: entre las rutinas activas
 * cuyo days incluye el día, la creada más recientemente.
 */
fun resolveToday(routines: List<Routine>, date: LocalDate, everSynced: Boolean): TodayContent {
    if (!everSynced) return TodayContent.NeverSynced
    if (routines.isEmpty()) return TodayContent.NoRoutine
    val newestFirst = routines.sortedByDescending { it.createdAt }
    val today = date.dayOfWeek
    newestFirst.firstOrNull { today in it.days }?.let { return TodayContent.Training(it) }
    val trainingDays = routines.flatMapTo(mutableSetOf()) { it.days }
    return TodayContent.Rest(newestFirst.first(), trainingDays, nextTrainingDay(routines, today))
}

/** Próximo día (de mañana a dentro de una semana) en que alguna rutina tiene entrenamiento. */
fun nextTrainingDay(routines: List<Routine>, from: DayOfWeek): DayOfWeek? =
    (1L..7L).map { from.plus(it) }.firstOrNull { day -> routines.any { day in it.days } }

/** Días del backend (monday … sunday) a DayOfWeek. Los valores desconocidos se ignoran. */
fun parseDays(raw: List<String>): Set<DayOfWeek> = raw.mapNotNull { name ->
    DayOfWeek.values().firstOrNull { it.name.equals(name.trim(), ignoreCase = true) }
}.toSet()
