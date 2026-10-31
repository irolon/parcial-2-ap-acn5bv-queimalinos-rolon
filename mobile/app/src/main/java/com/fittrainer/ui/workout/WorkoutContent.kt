package com.fittrainer.ui.workout

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.workout.canReplace
import com.fittrainer.data.workout.isPaused
import com.fittrainer.data.workout.lastDoneSet
import com.fittrainer.data.workout.remainingMs
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.components.BottomActions
import com.fittrainer.ui.workout.components.ExerciseHeading
import com.fittrainer.ui.workout.components.LoadPanel
import com.fittrainer.ui.workout.components.RestTimer
import com.fittrainer.ui.workout.components.SetTabs
import com.fittrainer.ui.workout.components.WorkoutTopBar
import java.time.Instant

/** Todo lo que la pantalla le pide al VM o abre (diálogos, hojas). */
class WorkoutActions(
    val onClose: () -> Unit,
    val onOpenList: () -> Unit,
    val onSelectSet: (Int) -> Unit,
    val onAdjustKg: (Double) -> Unit,
    val onEdit: () -> Unit,
    val onConfirm: () -> Unit,
    val onTechnique: () -> Unit,
    val onReplace: () -> Unit,
    val onRestAdjust: (Int) -> Unit,
    val onRestTogglePause: () -> Unit,
    val onRestSkip: () -> Unit,
    val onOpenSettings: () -> Unit,
    val onDismissError: () -> Unit,
    /** Tocaron Reemplazar con series ya registradas: se explica por qué no se puede. */
    val onReplaceLocked: () -> Unit = {},
)

/** Serie (mockup p.13) o timer a pantalla completa (p.14). Sin scroll para completar una serie. */
@Composable
fun WorkoutContent(state: WorkoutUiState, now: Instant, notificationsOn: Boolean, actions: WorkoutActions) {
    val workout = state.workout ?: return
    val exercise = state.exercise ?: return
    val rest = workout.rest
    if (state.isResting && rest != null) {
        val done = workout.lastDoneSet()
        // El aviso de error va arriba del timer: si falla Room al tocar Saltar/Pausar/±15 se tiene que ver.
        Box(Modifier.fillMaxSize()) {
            RestTimer(
                doneLine = done?.let { "SERIE ${it.setNumber} · ${kgNumber(it.kg)}KG × ${it.reps} ✓" },
                remainingMs = rest.remainingMs(now),
                totalSeconds = rest.totalSeconds,
                paused = rest.isPaused,
                nextLabel = "PRÓXIMA SERIE · ${workout.cursor.setNumber}/${exercise.totalSets} · ${exercise.name}",
                nextLoad = loadLine(state.load),
                onAdjust = actions.onRestAdjust,
                onTogglePause = actions.onRestTogglePause,
                onSkip = actions.onRestSkip,
            )
            state.error?.let {
                NoticeBanner(it, actions.onDismissError, Modifier.align(Alignment.TopCenter).padding(Spacing.lg))
            }
        }
        return
    }
    Column(
        Modifier.fillMaxSize().padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.lg),
    ) {
        WorkoutTopBar(workout, formatElapsed(workout.startedAt, now), actions.onClose, actions.onOpenList)
        if (!notificationsOn) {
            // Tocar el aviso abre los Ajustes de notificaciones de la app.
            Text(
                NO_NOTIFICATIONS,
                style = MaterialTheme.typography.bodySmall,
                color = FtColors.Amber,
                modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget).clickable(onClick = actions.onOpenSettings),
            )
        }
        state.error?.let { NoticeBanner(it, actions.onDismissError) }
        SetTabs(workout, state.shownSet, actions.onSelectSet)
        ExerciseHeading(exercise.name, actions.onOpenList)
        LoadPanel(suggestedChip(exercise), state.load, actions.onAdjustKg, actions.onEdit)
        Button(onClick = actions.onConfirm, modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp)) {
            Text(ctaLabel(state), style = MaterialTheme.typography.labelLarge)
        }
        Spacer(Modifier.weight(1f))
        BottomActions(workout.canReplace(workout.cursor.position), actions.onTechnique, actions.onReplace, actions.onReplaceLocked)
    }
}
