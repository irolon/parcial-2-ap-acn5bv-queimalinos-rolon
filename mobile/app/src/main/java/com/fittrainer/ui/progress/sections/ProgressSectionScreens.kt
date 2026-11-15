package com.fittrainer.ui.progress.sections

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.progress.charts.ChartsScreen
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.HistoryScreen
import com.fittrainer.ui.workout.history.HistoryViewModel

/** Historial a pantalla completa (se abre desde la tarjeta de Progreso o desde un aviso). */
@Composable
fun ProgressHistoryScreen(onBack: () -> Unit, onOpen: (String) -> Unit, viewModel: HistoryViewModel = hiltViewModel()) {
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    SectionScaffold("Historial", onBack) { HistoryScreen(onOpen, viewModel) }
}

/** Gráficos a pantalla completa. [exerciseId] llega de un aviso de récord y se aplica una sola vez. */
@Composable
fun ProgressChartsScreen(onBack: () -> Unit, exerciseId: String?, history: HistoryViewModel = hiltViewModel()) {
    val historyState by history.uiState.collectAsStateWithLifecycle()
    var pendingExercise by rememberSaveable { mutableStateOf(exerciseId) }
    SectionScaffold("Gráficos", onBack) {
        ChartsScreen(
            // Los gráficos salen del historial guardado: deslizar para actualizar refresca el historial.
            onRefreshHistory = history::onPullToRefresh,
            extraRefreshing = historyState.isRefreshing,
            openExercise = pendingExercise,
            onOpenExerciseHandled = { pendingExercise = null },
        )
    }
}

@Composable
private fun SectionScaffold(title: String, onBack: () -> Unit, content: @Composable () -> Unit) {
    Column(Modifier.fillMaxSize().background(FtColors.Background)) {
        Row(Modifier.padding(start = Spacing.sm, top = Spacing.sm, end = Spacing.lg), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
            }
            Text(title, style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary, modifier = Modifier.semantics { heading() })
        }
        Box(Modifier.weight(1f)) { content() }
    }
}
