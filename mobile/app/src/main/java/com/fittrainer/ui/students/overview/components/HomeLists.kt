package com.fittrainer.ui.students.overview.components

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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fittrainer.data.students.overview.AttentionItem
import com.fittrainer.data.students.overview.RecentItem
import com.fittrainer.ui.students.overview.attentionLine
import com.fittrainer.ui.students.overview.recentLine
import com.fittrainer.ui.students.overview.relativeTime
import com.fittrainer.ui.students.components.StudentAvatar
import com.fittrainer.ui.students.initials
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.Instant

/** Una fila de "requieren atención": avatar, nombre, el motivo y la píldora "riesgo" (coral) o "aviso" (atenuada). */
@Composable
fun AttentionRow(item: AttentionItem, onClick: () -> Unit) {
    val risk = item is AttentionItem.AtRisk
    HomeRow(item.name, attentionLine(item), risk, onClick) {
        Pill(if (risk) "riesgo" else "aviso", if (risk) FtColors.Coral else FtColors.TextSecondary)
    }
}

/** Una fila de actividad reciente: nombre, "Push día 3 · RPE 8" y "hace 12 min". */
@Composable
fun RecentRow(item: RecentItem, now: Instant, onClick: () -> Unit) {
    HomeRow(item.name, recentLine(item), false, onClick) {
        Text(relativeTime(item.finishedAt, now), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
    }
}

@Composable
private fun HomeRow(name: String, line: String, risk: Boolean, onClick: () -> Unit, trailing: @Composable () -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget).clip(MaterialTheme.shapes.large)
            .background(FtColors.Card).clickable(onClick = onClick).padding(Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        StudentAvatar(initials(name), atRisk = risk, size = 40.dp)
        Column(Modifier.weight(1f)) {
            Text(name, style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(line, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        trailing()
    }
}

@Composable
private fun Pill(text: String, color: Color) {
    Text(
        text,
        Modifier.background(color.copy(alpha = 0.16f), MaterialTheme.shapes.small).padding(horizontal = Spacing.sm, vertical = 2.dp),
        style = MaterialTheme.typography.labelSmall,
        color = color,
    )
}
