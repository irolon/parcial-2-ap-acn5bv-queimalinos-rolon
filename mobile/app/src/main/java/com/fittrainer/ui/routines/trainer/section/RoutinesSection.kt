package com.fittrainer.ui.routines.trainer.section

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.routines.trainer.TrainerRoutineSummary
import com.fittrainer.ui.join.goalLabel
import com.fittrainer.ui.routines.trainer.ROUTINES_EMPTY
import com.fittrainer.ui.routines.trainer.ROUTINES_NOT_LOADED
import com.fittrainer.ui.routines.trainer.ROUTINES_SECTION
import com.fittrainer.ui.routines.trainer.ROUTINE_ACTIVE
import com.fittrainer.ui.routines.trainer.ROUTINE_INACTIVE
import com.fittrainer.ui.routines.trainer.routineDaysLabel
import com.fittrainer.ui.students.detail.components.SectionCard
import com.fittrainer.ui.students.sessions.components.RetryRow
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Sección de la ficha (E8): las rutinas del alumno, activas primero. Tocar una abre el editor. */
@Composable
fun RoutinesSection(onOpen: (String) -> Unit, viewModel: RoutinesSectionViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    SectionCard(ROUTINES_SECTION) {
        state.loadError?.let { RetryRow(it, viewModel::onRetry) }
        when {
            !state.loaded -> Unit
            state.routines.isEmpty() && state.loadError != null -> Unit
            state.routines.isEmpty() -> Text(
                if (state.everSynced) ROUTINES_EMPTY else ROUTINES_NOT_LOADED,
                style = MaterialTheme.typography.bodyMedium,
                color = FtColors.TextSecondary,
            )
            else -> state.routines.forEach { RoutineRow(it) { onOpen(it.id) } }
        }
    }
}

@Composable
private fun RoutineRow(routine: TrainerRoutineSummary, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget).clickable(onClick = onClick).padding(vertical = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(routine.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            val line = listOf(routineDaysLabel(routine.days), routine.goal?.let(::goalLabel).orEmpty()).filter { it.isNotEmpty() }
            Text(line.joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        }
        val color = if (routine.active) FtColors.Brand else FtColors.TextSecondary
        Text(
            if (routine.active) ROUTINE_ACTIVE else ROUTINE_INACTIVE,
            modifier = Modifier.background(color.copy(alpha = 0.16f), MaterialTheme.shapes.small).padding(horizontal = Spacing.sm, vertical = 2.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
        )
    }
}
