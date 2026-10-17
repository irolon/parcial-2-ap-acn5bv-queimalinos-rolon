package com.fittrainer.ui.today.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.formatKg
import com.fittrainer.ui.today.muscleLabel

/** Detalle del ejercicio. El video es un link externo: solo se ofrece con red. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExerciseDetailSheet(exercise: RoutineExercise, canOpenVideo: Boolean, onDismiss: () -> Unit) {
    val uriHandler = LocalUriHandler.current
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = FtColors.Surface) {
        Column(
            Modifier
                .fillMaxWidth()
                // Notas largas o fuente grande: que "Ver video" siga siendo alcanzable.
                .verticalScroll(rememberScrollState())
                .padding(horizontal = Spacing.lg)
                .padding(bottom = Spacing.xl),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            Text(exercise.name, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            val muscle = muscleLabel(exercise.muscleGroup)
            if (muscle.isNotEmpty()) {
                Text(muscle.uppercase(), style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
            }
            DetailLine("Series", exercise.sets?.toString())
            DetailLine("Repeticiones", exercise.reps?.toString())
            DetailLine("Peso sugerido", exercise.suggestedKg?.let(::formatKg))
            DetailLine("Tempo", exercise.tempo)
            DetailLine("Descanso", exercise.restSeconds?.let { "$it s" })
            DetailLine("Equipo", exercise.equipment)
            val notes = exercise.notes
            if (!notes.isNullOrBlank()) {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    Text("NOTA DEL ENTRENADOR", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
                    Text(notes, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
                }
            }
            val video = exercise.videoUrl
            if (video != null && canOpenVideo) {
                OutlinedButton(
                    // Sin app que abra el link, no se hace nada (no se rompe la pantalla).
                    onClick = { runCatching { uriHandler.openUri(video) } },
                    modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                ) { Text("Ver video") }
            }
        }
    }
}

@Composable
private fun DetailLine(label: String, value: String?) {
    if (value.isNullOrBlank()) return
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        Text(value, style = MaterialTheme.typography.labelMedium, color = FtColors.TextPrimary)
    }
}
