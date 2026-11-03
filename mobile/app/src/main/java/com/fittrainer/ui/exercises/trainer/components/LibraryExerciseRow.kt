package com.fittrainer.ui.exercises.trainer.components

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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.exercises.trainer.TrainerExercise
import com.fittrainer.ui.exercises.trainer.OWN_TAG
import com.fittrainer.ui.exercises.trainer.exerciseSubtitle
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Fila de la biblioteca del entrenador: nombre, "Bíceps · Mancuernas" y PROPIO en los suyos. */
@Composable
fun LibraryExerciseRow(exercise: TrainerExercise, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.medium).clickable(onClick = onClick)
            .heightIn(min = Spacing.minTouchTarget).padding(Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(exercise.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            val subtitle = exerciseSubtitle(exercise)
            if (subtitle.isNotEmpty()) Text(subtitle, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        }
        if (!exercise.isGlobal) {
            Text(
                OWN_TAG,
                modifier = Modifier.background(FtColors.Brand.copy(alpha = 0.16f), MaterialTheme.shapes.small).padding(horizontal = Spacing.sm, vertical = 2.dp),
                style = MaterialTheme.typography.labelSmall,
                color = FtColors.Brand,
            )
        }
    }
}
