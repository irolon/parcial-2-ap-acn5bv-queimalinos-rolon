package com.fittrainer.ui.today.week

import com.fittrainer.data.gamification.BUSINESS_ZONE
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.data.workout.history.HistoryOrigin
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters

/** Día (hora argentina) en que arrancó una sesión. */
fun sessionDate(startedAt: Instant): LocalDate = startedAt.atZone(BUSINESS_ZONE).toLocalDate()

/** Las 7 fechas, de lunes a domingo, de la semana de [today]. */
fun weekDates(today: LocalDate): List<LocalDate> {
    val lunes = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    return (0L..6L).map { lunes.plusDays(it) }
}

/** Sesiones que cuentan: las rechazadas por el servidor (LOCAL_FAILED) no. */
private fun List<HistoryItem>.counted() = filter { it.origin != HistoryOrigin.LOCAL_FAILED }

/** Días con al menos una sesión que cuenta. */
fun trainedDates(sessions: List<HistoryItem>): Set<LocalDate> =
    sessions.counted().mapTo(mutableSetOf()) { sessionDate(it.startedAt) }

/**
 * Números de "Esta semana". [monthSessions] cuenta sesiones (no días) del mes de hoy; [monthPrs], las de ese mes
 * que tuvieron algún récord.
 */
data class WeekStats(val doneDays: Int, val assignedDays: Int, val monthSessions: Int, val monthPrs: Int)

fun weekStats(sessions: List<HistoryItem>, assigned: Set<DayOfWeek>, today: LocalDate): WeekStats {
    val semana = weekDates(today).toSet()
    val doneDays = trainedDates(sessions).count { it in semana }
    val delMes = sessions.counted().filter {
        val fecha = sessionDate(it.startedAt)
        fecha.year == today.year && fecha.month == today.month
    }
    return WeekStats(doneDays, assigned.size, delMes.size, delMes.count { it.hasPr })
}

data class NextTraining(val date: LocalDate, val routine: Routine)

/** Primer día después de [today] (hasta 7 días) con rutina; si comparten día, la primera de la lista. */
fun nextTraining(routines: List<Routine>, today: LocalDate): NextTraining? {
    for (offset in 1L..7L) {
        val fecha = today.plusDays(offset)
        val rutina = routines.firstOrNull { fecha.dayOfWeek in it.days }
        if (rutina != null) return NextTraining(fecha, rutina)
    }
    return null
}

/** Qué se muestra al tocar un día de la semana. */
sealed interface DayView {
    data object Today : DayView

    /** Día pasado: sus sesiones (la más reciente primero) y si tenía rutina asignada. */
    data class Past(val date: LocalDate, val sessions: List<HistoryItem>, val assigned: Boolean) : DayView

    /** Día futuro: lo que toca (sin "Empezar"), o null si es de descanso; entonces [after] es el próximo entreno. */
    data class Future(val date: LocalDate, val routine: Routine?, val after: NextTraining? = null) : DayView
}

fun dayView(selected: LocalDate, today: LocalDate, sessions: List<HistoryItem>, routines: List<Routine>): DayView {
    val rutina = routines.firstOrNull { selected.dayOfWeek in it.days }
    return when {
        selected == today -> DayView.Today
        selected.isBefore(today) -> DayView.Past(
            date = selected,
            sessions = sessions.counted().filter { sessionDate(it.startedAt) == selected }
                .sortedByDescending { it.startedAt },
            assigned = rutina != null,
        )
        else -> DayView.Future(selected, rutina, if (rutina == null) nextTraining(routines, selected) else null)
    }
}

/** Al volver a la pantalla se conserva el día elegido, salvo que cambió el día (o la semana) y ya no corresponda. */
fun selectionAfterStart(previousToday: LocalDate, newToday: LocalDate, selected: LocalDate): LocalDate =
    if (newToday != previousToday || selected !in weekDates(newToday)) newToday else selected
