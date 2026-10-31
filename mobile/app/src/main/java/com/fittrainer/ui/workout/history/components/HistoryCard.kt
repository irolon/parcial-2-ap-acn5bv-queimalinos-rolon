package com.fittrainer.ui.workout.history.components

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
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.historyDate
import com.fittrainer.ui.workout.history.historyLine
import com.fittrainer.ui.workout.rpeLabel
import java.time.ZoneId

/** Una sesión del historial: fecha y rutina, "54 min · 18 series · 4.210 kg", RPE, 🏆, 💬 y "Sin subir" / "No se pudo subir". */
@Composable
fun HistoryCard(item: HistoryItem, zone: ZoneId, onClick: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(FtColors.Card).clickable(onClickLabel = "Ver detalle", onClick = onClick)
            .heightIn(min = Spacing.minTouchTarget).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.xs),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text(historyDate(item.startedAt, zone), style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
            SyncMark(item.origin)
        }
        Text(item.routineName ?: "Sin rutina", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        Text(historyLine(item.durationMin, item.sets, item.volumeKg), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        val badges = listOfNotNull(item.rpe?.takeIf { rpeLabel(it) != null }?.let { "RPE $it" }, "🏆".takeIf { item.hasPr }, "💬".takeIf { item.hasComment && !item.commentUnread })
        if (badges.isNotEmpty() || item.commentUnread) Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            if (badges.isNotEmpty()) Text(badges.joinToString("  "), style = MaterialTheme.typography.labelLarge, color = FtColors.TextPrimary)
            if (item.commentUnread) Text("💬 Nuevo", style = MaterialTheme.typography.labelLarge, color = FtColors.BrandText)
        }
    }
}
