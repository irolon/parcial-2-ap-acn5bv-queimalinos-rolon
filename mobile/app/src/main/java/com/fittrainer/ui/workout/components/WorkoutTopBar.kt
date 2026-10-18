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
import androidx.compose.ui.unit.dp
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.firstPendingSet
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.exerciseCounter

/** ✕, "EJERCICIO 3 / 6" + nombre (tocable: abre la lista), cronómetro y un segmento por ejercicio. */
@Composable
fun WorkoutTopBar(workout: Workout, title: String, elapsed: String, onClose: () -> Unit, onOpenList: () -> Unit) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onClose) { Icon(Icons.Filled.Close, contentDescription = "Salir de la sesión") }
            Column(
                Modifier.weight(1f).heightIn(min = Spacing.minTouchTarget).clickable(onClick = onOpenList),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(exerciseCounter(workout), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
                Text(title, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary, maxLines = 1)
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
