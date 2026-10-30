package com.fittrainer.ui.workout.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.firstPendingSet
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.exerciseCounter

/**
 * ✕, "EJERCICIO 3 / 6" (tocable: abre la lista), cronómetro y un segmento por ejercicio. El nombre del
 * ejercicio va debajo de S1…Sn ([ExerciseHeading]).
 */
@Composable
fun WorkoutTopBar(workout: Workout, elapsed: String, onClose: () -> Unit, onOpenList: () -> Unit) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onClose) { Icon(Icons.Filled.Close, contentDescription = "Salir de la sesión") }
            Box(
                Modifier.weight(1f).heightIn(min = Spacing.minTouchTarget).clickable(onClick = onOpenList),
                contentAlignment = Alignment.Center,
            ) {
                Text(exerciseCounter(workout), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
            }
            Box(
                Modifier.clip(MaterialTheme.shapes.small).background(FtColors.Card).padding(horizontal = Spacing.sm, vertical = Spacing.xs),
            ) {
                Text("⏱ $elapsed", style = MaterialTheme.typography.labelMedium, color = FtColors.TextPrimary)
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            workout.exercises.forEach { e ->
                val color = when {
                    workout.firstPendingSet(e.position) == null -> FtColors.Brand
                    e.position == workout.cursor.position -> FtColors.BrandText
                    else -> FtColors.Elevated
                }
                Box(Modifier.weight(1f).height(3.dp).clip(MaterialTheme.shapes.extraSmall).background(color))
            }
        }
    }
}

/** Nombre del ejercicio en curso, debajo de S1…Sn (tocable: abre la lista de ejercicios). */
@Composable
fun ExerciseHeading(title: String, onOpenList: () -> Unit) {
    Box(
        Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget).clickable(onClick = onOpenList),
        contentAlignment = Alignment.Center,
    ) {
        Text(title, style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}
