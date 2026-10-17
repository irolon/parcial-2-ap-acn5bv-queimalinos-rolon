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
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.data.routine.TodayContent
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.components.ExerciseDetailSheet
import com.fittrainer.ui.today.components.ExerciseRow
import com.fittrainer.ui.today.components.NeverSyncedState
import com.fittrainer.ui.today.components.NoRoutineState
import com.fittrainer.ui.today.components.NoticeBanner
import com.fittrainer.ui.today.components.RestState
import com.fittrainer.ui.today.components.RoutineHeroCard
import com.fittrainer.ui.today.components.SectionLabel
import com.fittrainer.ui.today.components.TodayHeader
import com.fittrainer.ui.today.components.WeekStrip

/** Guía Mobile p.12 · 02 Rutina del día. */
@Composable
fun TodayScreen(viewModel: TodayViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    // ON_START: al entrar a la pestaña y cada vez que la app vuelve al frente.
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    TodayBody(state, onRefresh = viewModel::onPullToRefresh, onDismissNotice = viewModel::dismissNotice)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodayBody(state: TodayUiState, onRefresh: () -> Unit, onDismissNotice: () -> Unit) {
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
            todayItems(state, onExerciseClick = { selected = it })
        }
    }
    selected?.let { exercise ->
        ExerciseDetailSheet(exercise, canOpenVideo = !state.isOffline, onDismiss = { selected = null })
    }
}

private fun LazyListScope.todayItems(state: TodayUiState, onExerciseClick: (RoutineExercise) -> Unit) {
    val today = state.today.dayOfWeek
    when (val content = state.content) {
        is TodayContent.Training -> {
            item { WeekStrip(content.routine.days, today) }
            item { RoutineHeroCard(content.routine) }
            item { SectionLabel("PLAN DE HOY", content.routine.exercises.size.toString()) }
            items(content.routine.exercises, key = { it.id }) { exercise ->
                ExerciseRow(exercise, onClick = { onExerciseClick(exercise) })
            }
        }
        is TodayContent.Rest -> {
            // La unión de todas las rutinas, coherente con "Tu próximo entreno es el …".
            item { WeekStrip(content.trainingDays, today) }
            item { RestState(content.nextDay) }
        }
        TodayContent.NoRoutine -> item { NoRoutineState() }
        TodayContent.NeverSynced -> item { NeverSyncedState() }
        null -> Unit
    }
}
