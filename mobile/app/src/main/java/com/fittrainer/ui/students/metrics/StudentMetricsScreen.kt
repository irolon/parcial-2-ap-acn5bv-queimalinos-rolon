package com.fittrainer.ui.students.metrics

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.students.detail.dateLabel
import com.fittrainer.ui.students.metrics.components.MetricRow
import com.fittrainer.ui.students.metrics.components.NewMetricSheet
import com.fittrainer.ui.students.sessions.components.RetryRow
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Historial de medidas del alumno, con "+ Nueva medida" y borrar (las dos online). */
@Composable
fun StudentMetricsScreen(onBack: () -> Unit, viewModel: StudentMetricsViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    state.sheet?.let { NewMetricSheet(it, viewModel.today(), viewModel::onFormChange, viewModel::onSave, viewModel::onCloseSheet) }
    state.confirmDelete?.let { metric ->
        AlertDialog(
            onDismissRequest = viewModel::onCancelDelete,
            title = { Text("¿Borrar la medida del ${dateLabel(metric.recordedAt)}?") },
            text = { Text("No se puede deshacer: para corregirla, se borra y se vuelve a cargar.") },
            confirmButton = { TextButton(onClick = viewModel::onConfirmDelete) { Text("Borrar", color = FtColors.Coral) } },
            dismissButton = { TextButton(onClick = viewModel::onCancelDelete) { Text("Cancelar") } },
        )
    }
    LazyColumn(
        Modifier.fillMaxSize().background(FtColors.Background),
        contentPadding = PaddingValues(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                IconButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
                }
                Text(METRICS_TITLE, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            }
        }
        if (state.offline) item { OfflineIndicator(METRICS_NEEDS_NETWORK) }
        state.notice?.let { item { NoticeBanner(it, viewModel::dismissNotice) } }
        state.loadError?.let { item { RetryRow(it, viewModel::onRetry) } }
        item {
            Button(
                onClick = viewModel::onOpenNew,
                enabled = state.canWrite,
                modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
            ) { Text(NEW_METRIC) }
        }
        when {
            !state.loaded -> Unit
            state.metrics.isEmpty() -> if (state.loadError == null) {
                item { InfoCard(METRICS_TITLE, if (state.everSynced) METRICS_EMPTY else METRICS_NOT_LOADED) }
            }
            else -> items(state.metrics, key = { it.id }) { m -> MetricRow(m, state.canWrite) { viewModel.onAskDelete(m) } }
        }
    }
}
