package com.fittrainer.ui.messages.trainer.broadcast

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.messages.trainer.Conversation
import com.fittrainer.data.messages.trainer.MAX_BROADCAST
import com.fittrainer.data.messages.trainer.MAX_MESSAGE_LENGTH
import com.fittrainer.ui.messages.trainer.BROADCAST_ALL
import com.fittrainer.ui.messages.trainer.BROADCAST_HINT
import com.fittrainer.ui.messages.trainer.BROADCAST_TITLE
import com.fittrainer.ui.messages.trainer.BROADCAST_TOO_MANY
import com.fittrainer.ui.messages.trainer.COUNTER_FROM
import com.fittrainer.ui.messages.trainer.MESSAGE_TOO_LONG
import com.fittrainer.ui.messages.trainer.broadcastButton
import com.fittrainer.ui.messages.trainer.list.BroadcastState
import com.fittrainer.ui.routines.trainer.components.CheckRow
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Con más de esta cantidad de alumnos aparece la búsqueda. */
private const val SEARCH_FROM = 8

class BroadcastActions(
    val onText: (String) -> Unit,
    val onToggle: (String) -> Unit,
    val onToggleAll: () -> Unit,
    val onSend: () -> Unit,
    val onDismiss: () -> Unit,
)

/** Difusión (E11): elegir alumnos activos con casillas y mandarles el mismo texto en un solo POST. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BroadcastSheet(students: List<Conversation>, state: BroadcastState, text: String, offline: Boolean, actions: BroadcastActions) {
    var query by remember { mutableStateOf("") }
    val shown = students.filter { query.isBlank() || it.name.contains(query.trim(), ignoreCase = true) }
    ModalBottomSheet(onDismissRequest = actions.onDismiss) {
        LazyColumn(Modifier.fillMaxWidth().padding(horizontal = Spacing.lg), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            item { Text(BROADCAST_TITLE, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary) }
            item {
                OutlinedTextField(
                    text, actions.onText, Modifier.fillMaxWidth().padding(vertical = Spacing.sm),
                    placeholder = { Text(BROADCAST_HINT) }, minLines = 3, maxLines = 6, enabled = !state.sending,
                    supportingText = when {
                        text.length > MAX_MESSAGE_LENGTH -> { { Text(MESSAGE_TOO_LONG, color = FtColors.Coral) } }
                        text.length >= COUNTER_FROM -> { { Text("${text.length}/$MAX_MESSAGE_LENGTH") } }
                        else -> null
                    },
                )
            }
            if (students.size > SEARCH_FROM) {
                item { OutlinedTextField(query, { query = it }, Modifier.fillMaxWidth(), label = { Text("Buscar") }, singleLine = true) }
            }
            item {
                val all = students.isNotEmpty() && state.selected.containsAll(students.map { it.studentId })
                CheckRow(BROADCAST_ALL, all, enabled = !state.sending) { actions.onToggleAll() }
            }
            items(shown, key = { it.studentId }) { s ->
                CheckRow(s.name, s.studentId in state.selected, enabled = !state.sending) { actions.onToggle(s.studentId) }
            }
            item {
                (state.error ?: BROADCAST_TOO_MANY.takeIf { state.selected.size > MAX_BROADCAST })?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.Coral)
                }
                Button(
                    onClick = actions.onSend,
                    enabled = !offline && state.canSend(text),
                    modifier = Modifier.fillMaxWidth().padding(top = Spacing.sm, bottom = Spacing.lg).height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
                ) { Text(broadcastButton(state.selected.size)) }
            }
        }
    }
}
