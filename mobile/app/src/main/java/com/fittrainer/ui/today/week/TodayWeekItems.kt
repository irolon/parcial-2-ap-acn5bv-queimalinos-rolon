package com.fittrainer.ui.today.week

import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.data.routine.TodayContent
import com.fittrainer.ui.components.exercise.ExerciseRow
import com.fittrainer.ui.components.exercise.SectionLabel
import com.fittrainer.ui.today.TodayUiState
import com.fittrainer.ui.today.components.NeverSyncedState
import com.fittrainer.ui.today.components.NoRoutineState
import com.fittrainer.ui.today.components.RestState
import com.fittrainer.ui.today.components.WeekStrip
import com.fittrainer.ui.today.exerciseSubtitle
import java.time.LocalDate

/** Lo que Hoy hace al tocar la semana, un día pasado o futuro, o las tarjetas de progreso. */
data class WeekActions(
    val onSelect: (LocalDate) -> Unit = {},
    val onOpenRoutine: (String) -> Unit = {},
    val onOpenSession: (String) -> Unit = {},
    val onOpenAchievements: () -> Unit = {},
)

/** Lo que cambia según el estado de la pantalla; agrupado para que las funciones de abajo no pasen de 6 parámetros. */
class TodaySlots(
    val uploads: LazyListScope.() -> Unit,
    /** El Boolean dice si el hero está a la vista; con otro día elegido no lo está y la tarjeta es la única vuelta a la sesión. */
    val activeCard: LazyListScope.(heroVisible: Boolean) -> Unit,
    val hero: LazyListScope.(Routine) -> Unit,
)

/** Sin estado de semana (previews, tests): hoy elegido, sin días hechos. */
private fun fallbackWeek(state: TodayUiState, content: TodayContent?): TodayWeekState = weekState(
    state.today, state.today, emptyList(), emptyList(), null,
).copy(
    trainingDays = when (content) {
        is TodayContent.Training -> content.routine.days
        is TodayContent.Rest -> content.trainingDays
        else -> emptySet()
    },
)

internal fun LazyListScope.todayItems(
    state: TodayUiState,
    week: TodayWeekState?,
    actions: WeekActions,
    onExerciseClick: (RoutineExercise) -> Unit,
    slots: TodaySlots,
) {
    when (val content = state.content) {
        is TodayContent.Training -> {
            // La semana de la rutina de hoy (como antes); lo de la semana real solo agrega ✓ y el día elegido.
            val w = (week ?: fallbackWeek(state, content)).copy(trainingDays = content.routine.days)
            item { strip(w, actions, stats = if (w.selected == w.today) null else w.stats) }
            slots.uploads(this) // El aviso de subidas va debajo de la semana (si no hay semana, arriba de todo).
            // Con hoy elegido, solo si la sesión abierta es de otra rutina (el hero queda bloqueado); con otro día, siempre que haya una.
            slots.activeCard(this, w.selected == w.today)
            if (w.selected == w.today) {
                slots.hero(this, content.routine)
                item { SectionLabel("PLAN DE HOY", content.routine.exercises.size.toString()) }
                items(content.routine.exercises, key = { it.id }) { exercise ->
                    ExerciseRow(exercise.name, exerciseSubtitle(exercise), onClick = { onExerciseClick(exercise) })
                }
            } else {
                dayItems(w, actions)
            }
        }
        is TodayContent.Rest -> {
            slots.activeCard(this, true)
            // La unión de todas las rutinas, coherente con "Tu próximo entreno es el …".
            val w = (week ?: fallbackWeek(state, content)).copy(trainingDays = content.trainingDays)
            item { strip(w, actions) }
            slots.uploads(this)
            if (w.selected == w.today) {
                if (w.next == null) item { RestState(content.nextDay) }
                restProgressItems(w, actions)
            } else {
                dayItems(w, actions)
            }
        }
        // Sin semana el aviso de subidas va arriba de todo (y antes de volver a la sesión abierta).
        TodayContent.NoRoutine -> { slots.uploads(this); slots.activeCard(this, true); item { NoRoutineState() } }
        TodayContent.NeverSynced -> { slots.uploads(this); slots.activeCard(this, true); item { NeverSyncedState() } }
        null -> { slots.uploads(this); slots.activeCard(this, true) }
    }
}

@Composable
private fun strip(w: TodayWeekState, actions: WeekActions, stats: WeekStats? = w.stats) =
    WeekStrip(w.week, w.trainingDays, w.today, w.done, w.selected, actions.onSelect, stats)
