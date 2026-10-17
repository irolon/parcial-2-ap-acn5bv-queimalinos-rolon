package com.fittrainer.ui.components.exercise

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
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

const val VIDEO_NEEDS_CONNECTION = "El video necesita conexión"

/** Detalle del ejercicio. El video es un link externo: con red se abre; sin red, se avisa. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExerciseDetailSheet(detail: ExerciseDetail, canOpenVideo: Boolean, onDismiss: () -> Unit) {
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
            Text(detail.name, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            val muscle = muscleLabel(detail.muscleGroup)
            if (muscle.isNotEmpty()) {
                Text(muscle.uppercase(), style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
            }
            DetailLine("Series", detail.sets?.toString())
            DetailLine("Repeticiones", detail.reps?.toString())
            DetailLine("Peso sugerido", detail.suggestedKg?.let(::formatKg))
            DetailLine("Tempo", detail.tempo)
            DetailLine("Descanso", detail.restSeconds?.let { "$it s" })
            DetailLine("Equipo", detail.equipment)
            DetailBlock("DESCRIPCIÓN", detail.description)
            DetailBlock("NOTA DEL ENTRENADOR", detail.notes)
            VideoAction(detail.videoUrl, canOpenVideo)
        }
    }
}

@Composable
private fun VideoAction(video: String?, canOpenVideo: Boolean) {
    if (video.isNullOrBlank()) return
    if (!canOpenVideo) {
        Text(VIDEO_NEEDS_CONNECTION, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        return
    }
    val uriHandler = LocalUriHandler.current
    OutlinedButton(
        // Sin app que abra el link, no se hace nada (no se rompe la pantalla).
        onClick = { runCatching { uriHandler.openUri(video) } },
        modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
    ) { Text("Ver video") }
}

@Composable
private fun DetailBlock(label: String, text: String?) {
    if (text.isNullOrBlank()) return
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        Text(text, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
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
