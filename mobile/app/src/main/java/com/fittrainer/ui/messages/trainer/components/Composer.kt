package com.fittrainer.ui.messages.trainer.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.messages.trainer.MAX_MESSAGE_LENGTH
import com.fittrainer.ui.messages.trainer.ATTACH
import com.fittrainer.ui.messages.trainer.COMPOSER_HINT
import com.fittrainer.ui.messages.trainer.COUNTER_FROM
import com.fittrainer.ui.messages.trainer.MESSAGE_TOO_LONG
import com.fittrainer.ui.messages.trainer.SEND
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/**
 * La caja de texto redonda y el botón de enviar (44 dp). disabledHint: por qué no se puede escribir (sin red, dado de baja).
 * Con [onAttach] suma el botón de adjuntar una foto, y [attachment] se dibuja arriba de la caja (tarjeta 18).
 */
@Composable
fun Composer(
    draft: String,
    canSend: Boolean,
    disabledHint: String?,
    onDraft: (String) -> Unit,
    onSend: () -> Unit,
    onAttach: (() -> Unit)? = null,
    attachment: (@Composable () -> Unit)? = null,
) {
    Column(Modifier.fillMaxWidth().padding(horizontal = Spacing.md, vertical = Spacing.sm)) {
        attachment?.invoke()
        when {
            draft.length > MAX_MESSAGE_LENGTH -> Text(MESSAGE_TOO_LONG, style = MaterialTheme.typography.labelSmall, color = FtColors.Coral)
            draft.length >= COUNTER_FROM -> Text("${draft.length}/$MAX_MESSAGE_LENGTH", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            onAttach?.let {
                val enabled = disabledHint == null
                IconButton(onClick = it, enabled = enabled, modifier = Modifier.size(Spacing.minTouchTarget)) {
                    Icon(Icons.Filled.Add, contentDescription = ATTACH, tint = if (enabled) FtColors.TextPrimary else FtColors.TextSecondary)
                }
            }
            OutlinedTextField(
                value = draft,
                onValueChange = onDraft,
                modifier = Modifier.weight(1f),
                enabled = disabledHint == null,
                placeholder = { Text(disabledHint ?: COMPOSER_HINT) },
                shape = RoundedCornerShape(24.dp),
                maxLines = 5,
            )
            FilledIconButton(
                onClick = onSend,
                enabled = canSend,
                modifier = Modifier.size(Spacing.minTouchTarget),
                colors = IconButtonDefaults.filledIconButtonColors(containerColor = FtColors.Brand),
            ) { Icon(Icons.AutoMirrored.Filled.Send, contentDescription = SEND) }
        }
    }
}
