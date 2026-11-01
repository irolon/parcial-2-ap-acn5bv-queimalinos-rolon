package com.fittrainer.ui.notifications.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fittrainer.data.notifications.AppNotification
import com.fittrainer.data.notifications.NotificationType
import com.fittrainer.ui.notifications.NotificationTexts
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.Instant
import java.time.ZoneId

private fun icon(type: NotificationType): String = when (type) {
    NotificationType.COMMENT -> "💬"
    NotificationType.PR -> "🏆"
    NotificationType.ACHIEVEMENT -> "🎖️"
}

/** Un aviso. Sin leer: fondo azulado y un punto (sin borde lateral). Toda la fila es el toque (mínimo 44). */
@Composable
fun NotificationItem(item: AppNotification, now: Instant, zone: ZoneId, onClick: () -> Unit) {
    val shape = MaterialTheme.shapes.medium
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (item.read) FtColors.Card else FtColors.Brand.copy(alpha = 0.16f), shape)
            .clickable(onClickLabel = "Abrir aviso", onClick = onClick)
            .semantics(mergeDescendants = true) { if (!item.read) stateDescription = "Sin leer" }
            .heightIn(min = Spacing.minTouchTarget)
            .padding(Spacing.md),
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        // El emoji es decoración: TalkBack lo leería ("globo de diálogo", "trofeo").
        Text(icon(item.type), Modifier.clearAndSetSemantics { }, style = MaterialTheme.typography.titleLarge)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Text(
                item.title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = if (item.read) FontWeight.Medium else FontWeight.Bold,
                color = FtColors.TextPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            item.body?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary, maxLines = 3, overflow = TextOverflow.Ellipsis)
            }
            Text(
                NotificationTexts.relativeTime(item.createdAt, now, zone),
                style = MaterialTheme.typography.labelSmall,
                color = FtColors.TextSecondary,
            )
        }
        if (!item.read) {
            Box(Modifier.padding(top = Spacing.xs).size(8.dp).background(FtColors.BrandText, CircleShape).align(Alignment.Top))
        }
    }
}
