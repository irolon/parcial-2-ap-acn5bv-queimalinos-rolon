package com.fittrainer.ui.students.progress

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.students.detail.components.SectionCard
import com.fittrainer.ui.students.sessions.components.RetryRow
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Sección de la ficha (E3): SESIONES / RACHA / PRS del mes y el calendario de asistencia. */
@Composable
fun StudentProgressSection(viewModel: StudentProgressViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    SectionCard(PROGRESS_SECTION) {
        state.loadError?.let { RetryRow(it, viewModel::onRetry) }
        val p = state.progress
        if (p != null) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Stat("SESIONES", sessionsLabel(p.sessions, p.assignedDays), FtColors.TextPrimary)
                Stat("RACHA", "${p.streak}", if (p.streak > 0) FtColors.Coral else FtColors.TextPrimary)
                Stat("PRS", "${p.prs}", FtColors.TextPrimary)
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = viewModel::onPreviousMonth, enabled = state.canGoPrevious) {
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                    contentDescription = "Mes anterior",
                    tint = if (state.canGoPrevious) FtColors.TextPrimary else FtColors.Ink5,
                )
            }
            Text(
                monthTitle(state.month, state.current),
                Modifier.weight(1f),
                style = MaterialTheme.typography.titleSmall,
                color = FtColors.TextPrimary,
            )
            IconButton(onClick = viewModel::onNextMonth, enabled = state.canGoNext) {
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = "Mes siguiente",
                    tint = if (state.canGoNext) FtColors.TextPrimary else FtColors.Ink5,
                )
            }
        }
        when {
            p != null -> AttendanceCalendar(state.month, p.days)
            state.loaded && !state.refreshing && state.loadError == null -> Text(
                PROGRESS_NOT_LOADED,
                style = MaterialTheme.typography.bodyMedium,
                color = FtColors.TextSecondary,
            )
        }
    }
}

@Composable
private fun Stat(label: String, value: String, color: androidx.compose.ui.graphics.Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleLarge, color = color)
        Text(label, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
    }
}
