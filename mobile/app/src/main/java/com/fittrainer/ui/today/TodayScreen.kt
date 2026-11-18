package com.fittrainer.ui.today

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
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
import com.fittrainer.ui.gamification.GamificationContent
import com.fittrainer.ui.gamification.GamificationViewModel
import com.fittrainer.ui.gamification.components.StreakChip
import com.fittrainer.ui.sync.UploadStatusViewModel
import com.fittrainer.ui.sync.UploadsNoticeUi
import com.fittrainer.ui.sync.components.UploadsNotice
import com.fittrainer.ui.sync.uploadsNoticeUi
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.components.ActiveWorkoutCard
import com.fittrainer.ui.today.components.RoutineHeroCard
import com.fittrainer.ui.today.components.TodayHeader
import com.fittrainer.ui.today.components.TodayMusclesSheet
import com.fittrainer.ui.today.week.TodaySlots
import com.fittrainer.ui.today.week.TodayWeekState
import com.fittrainer.ui.today.week.TodayWeekViewModel
import com.fittrainer.ui.today.week.WeekActions
import com.fittrainer.ui.today.week.todayItems
import com.fittrainer.ui.workout.WorkoutEntryViewModel

/** Guía Mobile p.12 · 02 Rutina del día. */
@Composable
fun TodayScreen(
    onOpenWorkout: () -> Unit,
    unreadNotifications: Int = 0,
    onOpenNotifications: () -> Unit = {},
    onOpenRoutine: (String) -> Unit = {},
    onOpenSession: (String) -> Unit = {},
    onOpenAchievements: () -> Unit = {},
    viewModel: TodayViewModel = hiltViewModel(),
    entry: WorkoutEntryViewModel = hiltViewModel(),
    uploads: UploadStatusViewModel = hiltViewModel(),
    gamification: GamificationViewModel = hiltViewModel(),
    weekVm: TodayWeekViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val week by weekVm.state.collectAsStateWithLifecycle()
    val gamificationState by gamification.uiState.collectAsStateWithLifecycle()
    val activeWorkout by entry.active.collectAsStateWithLifecycle()
    val entryError by entry.error.collectAsStateWithLifecycle()
    val uploadCounts by uploads.counts.collectAsStateWithLifecycle()
    val manualUpload by uploads.manual.collectAsStateWithLifecycle()
    // ON_START: al entrar a la pestaña y cada vez que la app vuelve al frente.
    LifecycleStartEffect(viewModel, gamification, weekVm) {
        viewModel.onStart()
        gamification.onStart()
        weekVm.onStart()
        onStopOrDispose { }
    }
    TodayBody(
        // Si no se pudo abrir o terminar la sesión, el aviso va en el mismo banner que el de Hoy.
        entryError?.let { state.copy(notice = it) } ?: state,
        activeWorkout = activeWorkout,
        onStartWorkout = { routine -> entry.start(routine, onOpenWorkout) },
        onContinueWorkout = onOpenWorkout,
        onRefresh = { viewModel.onPullToRefresh(); gamification.onPullToRefresh(); weekVm.refresh() },
        // El aviso de error de gamificación no se muestra acá: Hoy ya tiene el suyo y la racha es secundaria.
        streakDays = (gamificationState.content as? GamificationContent.Ready)?.ready?.currentStreak ?: 0,
        isRefreshing = state.isRefreshing || gamificationState.isRefreshing,
        onDismissNotice = { if (entryError != null) entry.dismissError() else viewModel.dismissNotice() },
        uploads = uploadsNoticeUi(uploadCounts, manualUpload),
        onUploadNow = uploads::uploadNow,
        onDismissFailures = uploads::dismissFailures,
        unreadNotifications = unreadNotifications,
        onOpenNotifications = onOpenNotifications,
        week = week,
        weekActions = WeekActions(
            onSelect = weekVm::select,
            onOpenRoutine = onOpenRoutine,
            onOpenSession = onOpenSession,
            onOpenAchievements = onOpenAchievements,
        ),
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
    streakDays: Int = 0,
    isRefreshing: Boolean = state.isRefreshing,
    uploads: UploadsNoticeUi? = null,
    onUploadNow: () -> Unit = {},
    onDismissFailures: () -> Unit = {},
    unreadNotifications: Int = 0,
    onOpenNotifications: () -> Unit = {},
    week: TodayWeekState? = null,
    weekActions: WeekActions = WeekActions(),
) {
    var selected by remember { mutableStateOf<RoutineExercise?>(null) }
    // La clave es la rutina de hoy (null si no toca entrenar): al cambiar o desaparecer, la hoja vuelve a cerrada.
    val musclesKey = (state.content as? TodayContent.Training)?.routine?.id
    var musclesOpen by rememberSaveable(musclesKey) { mutableStateOf(false) }
    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize().background(FtColors.Background),
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    TodayHeader(
                        state.today, state.studentName, state.isOffline, showsRoutine = state.showsRoutine,
                        unreadNotifications = unreadNotifications, onOpenNotifications = onOpenNotifications,
                    )
                    StreakChip(streakDays)
                }
            }
            state.notice?.let { notice -> item { NoticeBanner(notice, onDismissNotice) } }
            val uploadsItem: LazyListScope.() -> Unit = {
                uploads?.let { ui -> item { UploadsNotice(ui, onUploadNow, onDismissFailures) } }
            }
            val activeCardItem: LazyListScope.(Boolean) -> Unit = { heroVisible ->
                activeWorkout?.takeIf { showsActiveWorkoutCard(state.content, it, heroVisible) }?.let { workout ->
                    item { ActiveWorkoutCard(workout.routineName, onContinueWorkout) }
                }
            }
            val heroItem: LazyListScope.(Routine) -> Unit = { routine ->
                item {
                    RoutineHeroCard(
                        routine,
                        startAction(routine, activeWorkout),
                        onStart = { onStartWorkout(routine) },
                        onContinue = onContinueWorkout,
                        onOpenMuscles = { musclesOpen = true },
                    )
                }
            }
            todayItems(state, week, weekActions, onExerciseClick = { selected = it }, TodaySlots(uploadsItem, activeCardItem, heroItem))
        }
    }
    selected?.let { exercise ->
        ExerciseDetailSheet(exercise.toDetail(), canOpenVideo = !state.isOffline, onDismiss = { selected = null })
    }
    musclesSheetRoutine(state.content, musclesOpen)?.let { routine ->
        TodayMusclesSheet(routine.name, remember(routine) { todayMuscles(routine) }) { musclesOpen = false }
    }
}
