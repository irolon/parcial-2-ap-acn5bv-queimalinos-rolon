package com.fittrainer.ui.progress

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.gamification.GamificationViewModel
import com.fittrainer.ui.gamification.components.AchievementsSummaryBlock
import com.fittrainer.ui.progress.components.ChartsPreviewCard
import com.fittrainer.ui.progress.components.HistoryPreviewCard
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.HistoryViewModel
import com.fittrainer.ui.workout.history.components.HistoryHeader

/**
 * Progreso del alumno como tablero: el resumen de la semana, los logros y una tarjeta por sección
 * (Historial y Gráficos), que abren su propia pantalla. Todo se desliza junto.
 * [openRequest] llega al tocar un aviso (tarjeta 17): abre Historial, o Gráficos con el ejercicio.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProgressScreen(
    onOpenHistory: () -> Unit,
    onOpenCharts: (exerciseId: String?) -> Unit,
    onOpenAchievements: () -> Unit,
    openRequest: ProgressOpen? = null,
    onOpenHandled: () -> Unit = {},
    historyViewModel: HistoryViewModel = hiltViewModel(),
    gamification: GamificationViewModel = hiltViewModel(),
) {
    val state by historyViewModel.uiState.collectAsStateWithLifecycle()
    val gamificationState by gamification.uiState.collectAsStateWithLifecycle()
    LaunchedEffect(openRequest) {
        when (openRequest) {
            null -> return@LaunchedEffect
            ProgressOpen.History -> onOpenHistory()
            is ProgressOpen.Charts -> onOpenCharts(openRequest.exerciseId)
        }
        onOpenHandled()
    }
    // El resumen de la semana y las tarjetas salen del historial: se refresca al entrar a Progreso.
    LifecycleStartEffect(historyViewModel, gamification) {
        historyViewModel.onStart()
        gamification.onStart()
        onStopOrDispose { }
    }
    PullToRefreshBox(
        isRefreshing = state.isRefreshing || gamificationState.isRefreshing,
        onRefresh = { historyViewModel.onPullToRefresh(); gamification.onPullToRefresh() },
        modifier = Modifier.fillMaxSize().background(FtColors.Background),
    ) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            HistoryHeader(state.weekSummary)
            AchievementsSummaryBlock(gamificationState, onOpenAchievements, gamification::onPullToRefresh, gamification::dismissNotice)
            HistoryPreviewCard(state) { onOpenHistory() }
            ChartsPreviewCard(state) { onOpenCharts(null) }
        }
    }
}
