package com.fittrainer.ui.today.week

import com.fittrainer.data.gamification.GamificationSummary
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.ui.gamification.GamificationReady
import com.fittrainer.ui.gamification.readyState
import java.time.DayOfWeek
import java.time.LocalDate

/** Todo lo que necesita "Hoy" en día de descanso: la semana, sus números y qué se muestra del día elegido. */
data class TodayWeekState(
    val today: LocalDate,
    val selected: LocalDate,
    val week: List<LocalDate>,
    /** Unión de los días de todas las rutinas. */
    val trainingDays: Set<DayOfWeek>,
    /** Días de esta semana con al menos una sesión que cuenta. */
    val done: Set<LocalDate>,
    /** `weekState` siempre lo calcula; null solo en el estado por defecto de la UI, sin semana cargada. */
    val stats: WeekStats?,
    /** Null (o 0): no se muestra. */
    val streak: Int?,
    /** Para la tarjeta del próximo logro; null sin datos o sin logro próximo. */
    val gamification: GamificationReady?,
    val next: NextTraining?,
    val day: DayView,
)

/** Estado puro: las rutinas se ordenan como en `resolveToday` (la más nueva primero) para que Hoy y la semana coincidan. */
fun weekState(
    today: LocalDate,
    selected: LocalDate,
    routines: List<Routine>,
    sessions: List<HistoryItem>,
    summary: GamificationSummary?,
): TodayWeekState {
    val ordenadas = routines.sortedByDescending { it.createdAt }
    val semana = weekDates(today)
    val dias = ordenadas.flatMapTo(mutableSetOf()) { it.days }
    val ready = summary?.let { readyState(it, today) }
    return TodayWeekState(
        today = today,
        selected = selected,
        week = semana,
        trainingDays = dias,
        done = trainedDates(sessions).filterTo(mutableSetOf()) { it in semana },
        stats = weekStats(sessions, dias, today),
        streak = summary?.currentStreak?.takeIf { it > 0 },
        gamification = ready?.takeIf { it.next != null },
        next = nextTraining(ordenadas, today),
        day = dayView(selected, today, sessions, ordenadas),
    )
}
