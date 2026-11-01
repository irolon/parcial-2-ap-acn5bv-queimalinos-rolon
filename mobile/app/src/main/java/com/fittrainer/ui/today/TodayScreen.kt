package com.fittrainer.ui.today

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.data.routine.TodayContent
import com.fittrainer.data.workout.Workout
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.exercise.ExerciseDetailSheet
import com.fittrainer.ui.components.exercise.ExerciseRow
import com.fittrainer.ui.components.exercise.SectionLabel
import com.fittrainer.ui.sync.UploadStatusViewModel
import com.fittrainer.ui.sync.UploadsNoticeUi
import com.fittrainer.ui.sync.components.UploadsNotice
import com.fittrainer.ui.sync.uploadsNoticeUi
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.components.ActiveWorkoutCard
import com.fittrainer.ui.today.components.NeverSyncedState
import com.fittrainer.ui.today.components.NoRoutineState
import com.fittrainer.ui.today.components.RestState
import com.fittrainer.ui.today.components.RoutineHeroCard
import com.fittrainer.ui.today.components.TodayHeader
import com.fittrainer.ui.today.components.WeekStrip
import com.fittrainer.ui.workout.WorkoutEntryViewModel

/** Guía Mobile p.12 · 02 Rutina del día. */
@Composable
fun TodayScreen(
    onOpenWorkout: () -> Unit,
    viewModel: TodayViewModel = hiltViewModel(),
    entry: WorkoutEntryViewModel = hiltViewModel(),
    uploads: UploadStatusViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val activeWorkout by entry.active.collectAsStateWithLifecycle()
    val entryError by entry.error.collectAsStateWithLifecycle()
    val uploadCounts by uploads.counts.collectAsStateWithLifecycle()
    val manualUpload by uploads.manual.collectAsStateWithLifecycle()
    // ON_START: al entrar a la pestaña y cada vez que la app vuelve al frente.
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    TodayBody(
        // Si no se pudo abrir o terminar la sesión, el aviso va en el mismo banner que el de Hoy.
        entryError?.let { state.copy(notice = it) } ?: state,
        activeWorkout = activeWorkout,
        onStartWorkout = { routine -> entry.start(routine, onOpenWorkout) },
        onContinueWorkout = onOpenWorkout,
        onRefresh = viewModel::onPullToRefresh,
        onDismissNotice = { if (entryError != null) entry.dismissError() else viewModel.dismissNotice() },
        uploads = uploadsNoticeUi(uploadCounts, manualUpload),
        onUploadNow = uploads::uploadNow,
        onDismissFailures = uploads::dismissFailures,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodayBody(
    state: TodayUiState,
    activeWorkout: Workout?,
    onStartWorkout: (Routine) -> Unit,
    onContinueWorkout: () -> Unit,
    onRefresh: () -> Unit,
    onDismissNotice: () -> Unit,
    uploads: UploadsNoticeUi? = null,
    onUploadNow: () -> Unit = {},
    onDismissFailures: () -> Unit = {},
) {
    var selected by remember { mutableStateOf<RoutineExercise?>(null) }
    PullToRefreshBox(
        isRefreshing = state.isRefreshing,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize().background(FtColors.Background),
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            item { TodayHeader(state.today, state.studentName, state.isOffline, showsRoutine = state.showsRoutine) }
            state.notice?.let { notice -> item { NoticeBanner(notice, onDismissNotice) } }
            val uploadsItem: LazyListScope.() -> Unit = {
                uploads?.let { ui -> item { UploadsNotice(ui, onUploadNow, onDismissFailures) } }
            }
            val activeCardItem: LazyListScope.() -> Unit = {
                activeWorkout?.takeIf { showsActiveWorkoutCard(state.content, it) }?.let { workout ->
                    item { ActiveWorkoutCard(workout.routineName, onContinueWorkout) }
                }
            }
            val heroItem: LazyListScope.(Routine) -> Unit = { routine ->
                item {
                    RoutineHeroCard(routine, startAction(routine, activeWorkout), { onStartWorkout(routine) }, onContinueWorkout)
                }
            }
            todayItems(state, onExerciseClick = { selected = it }, uploadsItem, activeCardItem, heroItem)
        }
    }
    selected?.let { exercise ->
        ExerciseDetailSheet(exercise.toDetail(), canOpenVideo = !state.isOffline, onDismiss = { selected = null })
    }
}

private fun LazyListScope.todayItems(
    state: TodayUiState,
    onExerciseClick: (RoutineExercise) -> Unit,
    uploadsItem: LazyListScope.() -> Unit,
    activeCardItem: LazyListScope.() -> Unit,
    heroItem: LazyListScope.(Routine) -> Unit,
) {
    val today = state.today.dayOfWeek
    when (val content = state.content) {
        is TodayContent.Training -> {
            item { WeekStrip(content.routine.days, today) }
            uploadsItem() // El aviso de subidas va debajo de la semana (si no hay semana, arriba de todo).
            activeCardItem() // Solo si la sesión abierta es de otra rutina: el hero queda bloqueado y se vuelve por acá.
            heroItem(content.routine)
            item { SectionLabel("PLAN DE HOY", content.routine.exercises.size.toString()) }
            items(content.routine.exercises, key = { it.id }) { exercise ->
                ExerciseRow(exercise.name, exerciseSubtitle(exercise), onClick = { onExerciseClick(exercise) })
            }
        }
        is TodayContent.Rest -> {
            activeCardItem()
            // La unión de todas las rutinas, coherente con "Tu próximo entreno es el …".
            item { WeekStrip(content.trainingDays, today) }
            uploadsItem()
            item { RestState(content.nextDay) }
        }
        // Sin semana el aviso de subidas va arriba de todo (y antes de volver a la sesión abierta).
        TodayContent.NoRoutine -> { uploadsItem(); activeCardItem(); item { NoRoutineState() } }
        TodayContent.NeverSynced -> { uploadsItem(); activeCardItem(); item { NeverSyncedState() } }
        null -> { uploadsItem(); activeCardItem() }
    }
}
