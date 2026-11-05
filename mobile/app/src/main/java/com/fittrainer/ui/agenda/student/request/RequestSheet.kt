package com.fittrainer.ui.agenda.student.request

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SheetValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.agenda.student.NOTE_LABEL
import com.fittrainer.ui.agenda.student.REQUEST_APPOINTMENT
import com.fittrainer.ui.agenda.student.REQUEST_HINT
import com.fittrainer.ui.agenda.student.REQUEST_OFFLINE
import com.fittrainer.ui.agenda.student.noteCounter
import com.fittrainer.ui.agenda.timeRangeLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Callbacks de la hoja para pedir un horario. */
class RequestSheetActions(
    val onNoteChange: (String) -> Unit,
    val onSubmit: () -> Unit,
    val onDismiss: () -> Unit,
)

/**
 * El horario elegido, la nota opcional (con contador hasta 500) y «Pedir turno». Mientras va el pedido el botón
 * muestra el progreso y la hoja no se cierra. [note] viene del mutableStateOf de la ViewModel.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequestSheet(state: RequestSheetState, note: String, offline: Boolean, actions: RequestSheetActions) {
    val pending by rememberUpdatedState(state.pending)
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true, confirmValueChange = { it != SheetValue.Hidden || !pending })
    ModalBottomSheet(onDismissRequest = actions.onDismiss, sheetState = sheetState) {
        Column(
            // Se desplaza: con el teclado abierto o la fuente ampliada el botón no queda afuera.
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState())
                .padding(start = Spacing.lg, end = Spacing.lg, bottom = Spacing.xl),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            Text(REQUEST_APPOINTMENT, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            Text(timeRangeLabel(state.at), style = MaterialTheme.typography.bodyLarge, color = FtColors.TextPrimary)
            OutlinedTextField(
                value = note,
                onValueChange = actions.onNoteChange,
                modifier = Modifier.fillMaxWidth(),
                enabled = !state.pending && !state.closed,
                label = { Text(NOTE_LABEL) },
                supportingText = { Text(noteCounter(note.length)) },
                minLines = 2,
                maxLines = 5,
            )
            Text(REQUEST_HINT, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
            (state.error ?: REQUEST_OFFLINE.takeIf { offline && !state.closed })?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.Coral)
            }
            if (!state.closed) {
                Button(
                    onClick = actions.onSubmit,
                    enabled = !offline && !state.pending,
                    modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                    colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
                ) {
                    if (state.pending) CircularProgressIndicator(Modifier.size(18.dp), color = FtColors.TextPrimary, strokeWidth = 2.dp)
                    else Text(REQUEST_APPOINTMENT)
                }
            }
        }
    }
}
