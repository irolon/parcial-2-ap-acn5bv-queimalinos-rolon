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
import com.fittrainer.data.workout.history.HistoryDetail
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.components.SyncMark
import com.fittrainer.ui.workout.history.historyLine
import com.fittrainer.ui.workout.rpeLabel

/** Rutina, si no se subió, resumen, RPE (si está en rango) y la nota del alumno. */
@Composable
fun DetailHeader(detail: HistoryDetail) {
    val item = detail.item
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Text(item.routineName ?: "Sin rutina", style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
        SyncMark(item.origin)
        Text(historyLine(item.durationMin, item.sets, item.volumeKg), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        item.rpe?.let { rpe ->
            rpeLabel(rpe)?.let { Text("RPE $rpe · $it", style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary) }
        }
        detail.notes?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary) }
    }
}

/** Lo que le escribió el entrenador, sobre el azul de marca. */
@Composable
fun TrainerCommentCard(comment: String) {
    Column(
        Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(FtColors.Brand).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.xs),
    ) {
        Text("Comentario de tu entrenador", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        Text(comment, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
    }
}
