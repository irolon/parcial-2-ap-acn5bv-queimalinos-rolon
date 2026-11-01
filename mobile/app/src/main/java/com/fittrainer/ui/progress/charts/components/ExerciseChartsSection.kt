package com.fittrainer.ui.progress.charts.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.fittrainer.data.progress.ChartMetric
import com.fittrainer.data.progress.ChartRange
import com.fittrainer.ui.progress.charts.ChartsContent
import com.fittrainer.ui.progress.charts.ChartsEmptyState
import com.fittrainer.ui.progress.charts.ChartsTexts
import com.fittrainer.ui.progress.charts.ChartsUiState
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Gráficos → Cargas (spec §3.2). Qué se muestra lo decide [ChartsEmptyState] (§3.4). */
@Composable
fun ExerciseChartsSection(
    state: ChartsUiState,
    onExercise: (String) -> Unit,
    onMetric: (ChartMetric) -> Unit,
    onRange: (ChartRange) -> Unit,
    onRetry: () -> Unit,
) {
    val content = ChartsEmptyState.exercises(state)
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        // Sin lista (Room no emitió, nunca se bajó o está vacía) no hay desplegable vacío: solo el estado.
        if (state.exercises.isNotEmpty()) ExercisePicker(state, onExercise)
        when (content) {
            ChartsContent.NO_EXERCISES -> CenteredMessage(ChartsTexts.NO_EXERCISES)
            ChartsContent.NEVER_LOADED -> CenteredMessage(ChartsTexts.NEVER_LOADED)
            ChartsContent.NO_DATA -> CenteredMessage(ChartsTexts.NO_DATA)
            ChartsContent.LOADING -> ChartLoading()
            ChartsContent.LOAD_FAILED -> LoadFailedMessage(onRetry)
            else -> ExerciseBody(state, content, onMetric, onRange)
        }
    }
}

@Composable
private fun ExerciseBody(
    state: ChartsUiState,
    content: ChartsContent,
    onMetric: (ChartMetric) -> Unit,
    onRange: (ChartRange) -> Unit,
) {
    // Siempre visibles, aunque haya una sola métrica: así se sabe qué se grafica (p. ej. "Reps totales").
    ChartChips(state.metrics, state.metric, ChartsTexts::metricLabel, onMetric)
    ChartChips(ChartRange.entries, state.range, ChartsTexts::rangeLabel, onRange)
    val unit = state.metric?.let(ChartsTexts::metricUnit) ?: "kg"
    when (content) {
        ChartsContent.EMPTY_PERIOD -> EmptyPeriodMessage(ChartsTexts.EMPTY_PERIOD) { onRange(ChartRange.ALL) }
        ChartsContent.ONE_POINT -> {
            state.exerciseSeries.lastOrNull()?.let {
                CenteredMessage(ChartsTexts.formatValue(it.value, unit) + " · " + ChartsTexts.formatShortDate(it.date))
            }
            CenteredMessage(ChartsTexts.ONE_POINT)
        }
        else -> {
            val name = state.exercises.firstOrNull { it.exerciseId == state.selectedExerciseId }?.name.orEmpty()
            val subject = state.metric?.let { "${ChartsTexts.metricLabel(it)} de $name" } ?: name
            val description = ChartsTexts.chartDescription(subject, state.range, state.exerciseSeries, unit)
            LineChart(state.exerciseSeries, state.record?.date, FtColors.Brand, description)
            val delta = state.exerciseDelta
            ChartStats(
                firstLabel = "Récord 🏆",
                firstValue = state.record?.let { ChartsTexts.formatValue(it.value, unit) } ?: "—",
                firstDetail = state.record?.let { ChartsTexts.formatShortDate(it.date) },
                deltaText = delta?.let { ChartsTexts.formatDelta(it, unit) },
                deltaColor = if (delta != null && ChartsTexts.isRise(delta)) FtColors.Green else FtColors.TextSecondary,
                deltaDetail = delta?.let { state.exerciseSeries.firstOrNull()?.date?.let(ChartsTexts::formatSince) },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExercisePicker(state: ChartsUiState, onExercise: (String) -> Unit) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    val selected = state.exercises.firstOrNull { it.exerciseId == state.selectedExerciseId }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = selected?.name.orEmpty(),
            onValueChange = {},
            readOnly = true,
            singleLine = true,
            label = { Text("Ejercicio") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)
                .menuAnchor(MenuAnchorType.PrimaryNotEditable),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            state.exercises.forEach { exercise ->
                DropdownMenuItem(
                    text = { Text(exercise.name, style = MaterialTheme.typography.bodyMedium) },
                    onClick = {
                        expanded = false
                        onExercise(exercise.exerciseId)
                    },
                    modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
                )
            }
        }
    }
}
