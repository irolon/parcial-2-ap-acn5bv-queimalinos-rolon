package com.fittrainer.ui.messages.trainer.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fittrainer.data.messages.trainer.Conversation
import com.fittrainer.ui.messages.trainer.listTime
import com.fittrainer.ui.messages.trainer.previewOf
import com.fittrainer.ui.messages.trainer.unreadDescription
import com.fittrainer.ui.students.components.StudentAvatar
import com.fittrainer.ui.students.initials
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.Instant
import java.time.ZoneId

/** Una conversación: iniciales, nombre, vista previa, hora y globito de no leídos (el texto va en negrita si hay). */
@Composable
fun ConversationRow(conversation: Conversation, now: Instant, zone: ZoneId, onClick: () -> Unit) {
    val unread = conversation.unread > 0
    Row(
        Modifier.fillMaxWidth().heightIn(min = 64.dp)
            .background(FtColors.Surface, RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = Spacing.md, vertical = Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        StudentAvatar(initials(conversation.name), atRisk = false)
        Column(Modifier.weight(1f)) {
            Text(conversation.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                previewOf(conversation.last),
                style = MaterialTheme.typography.bodyMedium,
                color = if (unread) FtColors.TextPrimary else FtColors.TextSecondary,
                fontWeight = if (unread) FontWeight.SemiBold else null,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            conversation.last?.let {
                Text(listTime(it.at, now, zone), style = MaterialTheme.typography.labelSmall, color = if (unread) FtColors.BrandText else FtColors.TextSecondary)
            }
            if (unread) {
                val text = if (conversation.unread > 99) "99+" else conversation.unread.toString()
                Box(
                    Modifier.sizeIn(minWidth = 22.dp, minHeight = 22.dp).background(FtColors.Brand, CircleShape)
                        .padding(horizontal = 6.dp).semantics { contentDescription = unreadDescription(conversation.unread) },
                    contentAlignment = Alignment.Center,
                ) { Text(text, style = MaterialTheme.typography.labelSmall, color = FtColors.TextPrimary) }
            }
        }
    }
}
