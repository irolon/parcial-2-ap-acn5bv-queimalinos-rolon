package com.fittrainer.ui.workout.components.rest

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import com.fittrainer.data.workout.MAX_REST_PICK_SECONDS
import com.fittrainer.data.workout.REST_STEP_SECONDS
import com.fittrainer.data.workout.WorkoutExercise
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.restPickerLabel

/** El descanso que va a correr después de cada serie de este ejercicio, con −15″ / +15″ (spec §4.2). */
@Composable
fun RestPicker(exercise: WorkoutExercise, onAdjust: (Int) -> Unit) {
    val chosen = exercise.restTotal
    val top = maxOf(MAX_REST_PICK_SECONDS, exercise.plannedRest)
    Row(
        Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(FtColors.Card).padding(Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(
            restPickerLabel(chosen, exercise.plannedRest),
            style = MaterialTheme.typography.bodyMedium,
            color = if (chosen == exercise.plannedRest) FtColors.TextSecondary else FtColors.BrandText,
            modifier = Modifier.weight(1f).padding(start = Spacing.sm),
        )
        FilledTonalButton(
            onClick = { onAdjust(-REST_STEP_SECONDS) },
            enabled = chosen > 0,
            modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
        ) { Text("−15″") }
        FilledTonalButton(
            onClick = { onAdjust(REST_STEP_SECONDS) },
            enabled = chosen < top,
            modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
        ) { Text("+15″") }
    }
}
