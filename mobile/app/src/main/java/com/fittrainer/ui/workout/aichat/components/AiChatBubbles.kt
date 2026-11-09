package com.fittrainer.ui.workout.aichat.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import com.fittrainer.data.chat.AiChatMessage
import com.fittrainer.data.chat.AiChatSuggestion
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.aichat.AI_REPLACE
import com.fittrainer.ui.workout.aichat.AI_THINKING

/** Una burbuja: el alumno a la derecha (azul de marca), la IA a la izquierda, con sus sugerencias abajo. */
@Composable
fun AiChatBubble(message: AiChatMessage, canReplace: Boolean, onReplace: (AiChatSuggestion) -> Unit, onReplaceLocked: () -> Unit) {
    Column(Modifier.fillMaxWidth(), horizontalAlignment = if (message.fromUser) Alignment.End else Alignment.Start) {
        Bubble(message.content, message.fromUser)
        message.suggestions.forEach { s ->
            SuggestionCard(s, canReplace, onClick = { if (canReplace) onReplace(s) else onReplaceLocked() })
        }
    }
}

@Composable
fun ThinkingBubble() = Bubble(AI_THINKING, fromUser = false)

@Composable
private fun Bubble(text: String, fromUser: Boolean) {
    Box(
        Modifier.widthIn(max = 300.dp).clip(MaterialTheme.shapes.medium)
            .background(if (fromUser) FtColors.Brand else FtColors.Card)
            .padding(horizontal = Spacing.md, vertical = Spacing.sm),
    ) {
        Text(text, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
    }
}

/** «Reemplazar» bloqueado se ve apagado pero se puede tocar: así la hoja explica por qué. */
@Composable
private fun SuggestionCard(s: AiChatSuggestion, canReplace: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.padding(top = Spacing.xs).widthIn(max = 300.dp).clip(MaterialTheme.shapes.medium)
            .background(FtColors.Elevated).padding(Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Column(Modifier.weight(1f)) {
            Text(s.name, style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary)
            Text(s.reason, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        }
        OutlinedButton(
            onClick = onClick,
            colors = if (canReplace) ButtonDefaults.outlinedButtonColors() else ButtonDefaults.outlinedButtonColors(contentColor = FtColors.Ink5),
            modifier = Modifier.heightIn(min = Spacing.minTouchTarget).then(
                if (canReplace) Modifier else Modifier.semantics { stateDescription = "No disponible" },
            ),
        ) { Text(AI_REPLACE) }
    }
}
