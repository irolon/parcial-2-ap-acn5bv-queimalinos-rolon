package com.fittrainer.ui.workout.aichat.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.TextFieldValue
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.aichat.AI_DICTATE
import com.fittrainer.ui.workout.aichat.AI_INPUT_HINT
import com.fittrainer.ui.workout.aichat.AI_SEND
import com.fittrainer.ui.workout.aichat.CHIP_HOW_TO
import com.fittrainer.ui.workout.aichat.CHIP_PAIN
import com.fittrainer.ui.workout.aichat.CHIP_REPLACE

/** Chips de preguntas frecuentes arriba de la caja; micrófono solo si hay dictado ([onDictate] != null). */
@Composable
fun AiChatComposer(
    draft: TextFieldValue,
    enabled: Boolean,
    canSend: Boolean,
    focus: FocusRequester,
    onDraft: (TextFieldValue) -> Unit,
    onQuestionChip: (String) -> Unit,
    onPainChip: () -> Unit,
    onDictate: (() -> Unit)?,
    onSend: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            AssistChip(onClick = { onQuestionChip(CHIP_REPLACE) }, label = { Text(CHIP_REPLACE) }, enabled = enabled)
            AssistChip(onClick = { onQuestionChip(CHIP_HOW_TO) }, label = { Text(CHIP_HOW_TO) }, enabled = enabled)
            AssistChip(onClick = onPainChip, label = { Text(CHIP_PAIN) }, enabled = enabled)
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = draft, onValueChange = onDraft, enabled = enabled, placeholder = { Text(AI_INPUT_HINT) },
                maxLines = 4, modifier = Modifier.weight(1f).focusRequester(focus),
            )
            // El ícono de micrófono no está en material-icons-core: un emoji evita sumar material-icons-extended.
            onDictate?.let {
                IconButton(onClick = it, enabled = enabled, modifier = Modifier.semantics { contentDescription = AI_DICTATE }) {
                    Text("🎤")
                }
            }
            IconButton(onClick = onSend, enabled = canSend) { Icon(Icons.AutoMirrored.Filled.Send, contentDescription = AI_SEND) }
        }
    }
}
