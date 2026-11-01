package com.fittrainer.ui.progress

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.progress.charts.ChartsScreen
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.HistoryScreen
import com.fittrainer.ui.workout.history.HistoryViewModel
import com.fittrainer.ui.workout.history.components.HistoryHeader

private val TABS = listOf("Historial", "Gráficos")

/**
 * Progreso: resumen de la semana arriba y solapas Historial | Gráficos (tarjeta 13).
 * [openRequest] llega al tocar un aviso (tarjeta 17): pone la solapa y, en Gráficos, el ejercicio.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProgressScreen(
    onOpen: (String) -> Unit,
    openRequest: ProgressOpen? = null,
    onOpenHandled: () -> Unit = {},
    historyViewModel: HistoryViewModel = hiltViewModel(),
) {
    val state by historyViewModel.uiState.collectAsStateWithLifecycle()
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var chartsExercise by rememberSaveable { mutableStateOf<String?>(null) }
    LaunchedEffect(openRequest) {
        when (openRequest) {
            null -> return@LaunchedEffect
            ProgressOpen.History -> tab = 0
            is ProgressOpen.Charts -> { tab = 1; chartsExercise = openRequest.exerciseId }
        }
        onOpenHandled()
    }
    // El refresco del historial corre al entrar a Progreso con cualquier solapa: Gráficos lee sus ejercicios de esa caché.
    LifecycleStartEffect(historyViewModel) {
        historyViewModel.onStart()
        onStopOrDispose { }
    }
    Column(Modifier.fillMaxSize().background(FtColors.Background)) {
        Box(Modifier.padding(PaddingValues(start = Spacing.lg, end = Spacing.lg, top = Spacing.lg))) {
            HistoryHeader(state.weekSummary)
        }
        PrimaryTabRow(
            selectedTabIndex = tab,
            containerColor = FtColors.Background,
            indicator = { TabRowDefaults.PrimaryIndicator(Modifier.tabIndicatorOffset(tab), color = FtColors.Brand) },
        ) {
            TABS.forEachIndexed { index, label ->
                Tab(
                    selected = tab == index,
                    onClick = { tab = index },
                    modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
                    selectedContentColor = FtColors.Brand,
                    unselectedContentColor = FtColors.TextSecondary,
                    text = { Text(label) },
                )
            }
        }
        Box(Modifier.weight(1f)) {
            if (tab == 0) HistoryScreen(onOpen, historyViewModel) else ChartsScreen(
                onRefreshHistory = historyViewModel::onPullToRefresh,
                openExercise = chartsExercise,
                onOpenExerciseHandled = { chartsExercise = null },
            )
        }
    }
}
