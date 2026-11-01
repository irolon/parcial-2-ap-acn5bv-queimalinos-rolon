package com.fittrainer.ui.workout.history.detail.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import com.fittrainer.data.workout.history.HistoryExercise
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.planLine
import com.fittrainer.ui.workout.history.setLine

/** Un ejercicio del detalle: nombre (y "en lugar de …"), 🏆, el plan y las series hechas. */
@Composable
fun ExerciseBlock(exercise: HistoryExercise) {
    Column(
        Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(FtColors.Card).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.xs),
    ) {
        Text(exercise.name + if (exercise.isPr) "  🏆" else "", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        exercise.originalName?.let { Text("en lugar de $it", style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary) }
        planLine(exercise.plannedSets, exercise.plannedReps, exercise.plannedKg)?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        }
        exercise.sets.forEach { Text(setLine(it), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary) }
    }
}
