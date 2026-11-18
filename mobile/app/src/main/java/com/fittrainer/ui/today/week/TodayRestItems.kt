package com.fittrainer.ui.today.week

import androidx.compose.foundation.lazy.LazyListScope
import com.fittrainer.ui.gamification.components.NextAchievementCard

/** Progreso de la semana en Hoy de descanso: cada tarjeta aparece solo si tiene dato. */
internal fun LazyListScope.restProgressItems(w: TodayWeekState, actions: WeekActions) {
    w.streak?.let { days -> item { StreakCard(days) } }
    w.stats?.let { stats -> item { WeekStatsRow(stats) } }
    w.gamification?.let { ready -> item { NextAchievementCard(ready, actions.onOpenAchievements) } }
    w.next?.let { next -> item { NextTrainingCard(next, w.today, actions.onOpenRoutine) } }
}

/** Día pasado o futuro elegido en la tira, con el botón para volver a hoy. */
internal fun LazyListScope.dayItems(w: TodayWeekState, actions: WeekActions) {
    when (val day = w.day) {
        is DayView.Past -> item { PastDay(day, actions.onOpenSession) }
        is DayView.Future -> item { FutureDay(day, actions.onOpenRoutine) }
        DayView.Today -> Unit
    }
}
