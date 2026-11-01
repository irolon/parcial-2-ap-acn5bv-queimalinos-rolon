package com.fittrainer.ui.progress.charts

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.progress.charts.components.BodyChartsSection
import com.fittrainer.ui.progress.charts.components.ExerciseChartsSection
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Progreso → Gráficos (tarjeta 13): selector Cargas | Medidas y la sección que corresponda. Pull = Reintentar (force) + refresco del historial. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChartsScreen(
    onRefreshHistory: () -> Unit = {},
    openExercise: String? = null,
    onOpenExerciseHandled: () -> Unit = {},
    viewModel: ChartsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    // Pedido de un aviso de récord (tarjeta 17): se aplica una vez y se consume.
    LaunchedEffect(openExercise) {
        openExercise?.let { viewModel.openExercise(it); onOpenExerciseHandled() }
    }
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    // En la primera bajada ya hay spinner en la sección (LOADING): el del pull no se suma.
    val sectionLoading = ChartsContent.LOADING ==
        if (state.view == ChartsView.LOADS) ChartsEmptyState.exercises(state) else ChartsEmptyState.body(state)
    PullToRefreshBox(
        isRefreshing = state.isRefreshing && !sectionLoading,
        onRefresh = {
            viewModel.onRetry()
            onRefreshHistory() // trae también los ejercicios nuevos del historial
        },
        modifier = Modifier.fillMaxSize().background(FtColors.Background),
    ) {
        ChartsContentColumn(state, viewModel)
    }
}

@Composable
private fun ChartsContentColumn(state: ChartsUiState, viewModel: ChartsViewModel) {
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        val views = ChartsView.entries
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
            views.forEachIndexed { index, view ->
                SegmentedButton(
                    selected = state.view == view,
                    onClick = { viewModel.onViewSelected(view) },
                    shape = SegmentedButtonDefaults.itemShape(index, views.size),
                    modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
                ) { Text(if (view == ChartsView.LOADS) "Cargas" else "Medidas") }
            }
        }
        if (state.isOffline) NoticeBanner(ChartsTexts.OFFLINE)
        if (state.refreshFailed) {
            NoticeBanner(ChartsTexts.REFRESH_FAILED, onDismiss = viewModel::dismissRefreshError)
            TextButton(onClick = viewModel::onRetry, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                Text(ChartsTexts.RETRY)
            }
        }
        when (state.view) {
            ChartsView.LOADS -> ExerciseChartsSection(
                state, viewModel::onExerciseSelected, viewModel::onMetricSelected, viewModel::onRangeSelected, viewModel::onRetry,
            )
            ChartsView.BODY -> BodyChartsSection(state, viewModel::onBodyFieldSelected, viewModel::onRangeSelected, viewModel::onRetry)
        }
    }
}
