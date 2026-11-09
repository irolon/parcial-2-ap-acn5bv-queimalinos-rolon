package com.fittrainer.ui.agenda.trainer

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SheetValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.agenda.APPOINTMENT_PAST
import com.fittrainer.ui.agenda.CANCEL_APPOINTMENT
import com.fittrainer.ui.agenda.CANCEL_BACK
import com.fittrainer.ui.agenda.CANCEL_YES
import com.fittrainer.ui.agenda.statusLabel
import com.fittrainer.ui.agenda.statusTextColor
import com.fittrainer.ui.agenda.timeRangeLabel
import com.fittrainer.ui.students.components.StudentAvatar
import com.fittrainer.ui.students.initials
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Callbacks de la hoja de un turno. */
class AppointmentSheetActions(
    val onConfirm: () -> Unit,
    val onAskCancel: () -> Unit,
    val onBack: () -> Unit,
    val onCancelConfirmed: () -> Unit,
    val onDismiss: () -> Unit,
)

/**
 * Un turno: alumno, día y hora, estado y nota. Pendiente: Confirmar y Cancelar turno; confirmado: Cancelar turno
 * (con confirmación dentro de la hoja). Mientras va el pedido no se cierra ni acepta otro toque.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppointmentSheet(state: AppointmentSheetState, offline: Boolean, actions: AppointmentSheetActions) {
    val pending by rememberUpdatedState(state.pending)
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true, confirmValueChange = { it != SheetValue.Hidden || !pending })
    val appt = state.appointment
    ModalBottomSheet(onDismissRequest = actions.onDismiss, sheetState = sheetState) {
        Column(
            // Se desplaza: una nota larga (hasta 500 caracteres) o la fuente ampliada no dejan los botones afuera.
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState())
                .padding(start = Spacing.lg, end = Spacing.lg, bottom = Spacing.xl),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                StudentAvatar(initials(appt.studentName).take(1), atRisk = false, size = 40.dp)
                Column {
                    Text(appt.studentName, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
                    Text(timeRangeLabel(appt.at), style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
                }
            }
            Text(statusLabel(appt.status), style = MaterialTheme.typography.labelMedium, color = statusTextColor(appt.status))
            appt.notes?.takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary) }
            val hasButtons = state.actions == AppointmentActions.CONFIRM_OR_CANCEL || state.actions == AppointmentActions.CANCEL
            (state.error ?: ACTION_OFFLINE.takeIf { offline && hasButtons })?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.Coral)
            }
            SheetActions(state, enabled = !offline && !state.pending, actions)
        }
    }
}

@Composable
private fun SheetActions(state: AppointmentSheetState, enabled: Boolean, actions: AppointmentSheetActions) {
    when (state.actions) {
        AppointmentActions.PAST -> Text(APPOINTMENT_PAST, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        AppointmentActions.NONE -> Unit
        AppointmentActions.CONFIRM_OR_CANCEL, AppointmentActions.CANCEL -> if (state.confirmingCancel) {
            Text(cancelQuestion(state.appointment), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
            ButtonRow {
                OutlinedButton(onClick = actions.onBack, enabled = !state.pending, modifier = touch()) { Text(CANCEL_BACK) }
                Button(
                    onClick = actions.onCancelConfirmed,
                    enabled = enabled,
                    modifier = touch(),
                    colors = ButtonDefaults.buttonColors(containerColor = FtColors.Coral),
                ) { Label(CANCEL_YES, state.pending) }
            }
        } else {
            ButtonRow {
                OutlinedButton(onClick = actions.onAskCancel, enabled = enabled, modifier = touch()) { Text(CANCEL_APPOINTMENT) }
                if (state.actions == AppointmentActions.CONFIRM_OR_CANCEL) {
                    Button(
                        onClick = actions.onConfirm,
                        enabled = enabled,
                        modifier = touch(),
                        colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
                    ) { Label(CONFIRM_APPOINTMENT, state.pending) }
                }
            }
        }
    }
}

@Composable
private fun ButtonRow(content: @Composable () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.md, Alignment.End)) { content() }
}

private fun touch() = Modifier.heightIn(min = Spacing.minTouchTarget)

/** El texto del botón, con el progreso mientras va el pedido. */
@Composable
private fun Label(text: String, pending: Boolean) {
    if (pending) CircularProgressIndicator(Modifier.size(18.dp), color = FtColors.TextPrimary, strokeWidth = 2.dp)
    else Text(text)
}
