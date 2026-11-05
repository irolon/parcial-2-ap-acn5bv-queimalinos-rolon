package com.fittrainer.ui.agenda.student.mine

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
import com.fittrainer.ui.agenda.student.REQUEST_OFFLINE
import com.fittrainer.ui.agenda.student.cancelMyQuestion
import com.fittrainer.ui.agenda.timeRangeLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Callbacks de la hoja de un turno propio. */
class MyAppointmentSheetActions(
    val onAskCancel: () -> Unit,
    val onBack: () -> Unit,
    val onCancelConfirmed: () -> Unit,
    val onDismiss: () -> Unit,
)

/**
 * Un turno propio: día y hora, estado y nota, con «Cancelar turno» (y su confirmación dentro de la hoja), como la
 * hoja de la agenda del PT. Mientras va el pedido no se cierra ni acepta otro toque.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyAppointmentSheet(state: MyAppointmentSheetState, offline: Boolean, actions: MyAppointmentSheetActions) {
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
            Text(timeRangeLabel(appt.at), style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            Text(statusLabel(appt.status), style = MaterialTheme.typography.labelMedium, color = statusTextColor(appt.status))
            appt.notes?.takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary) }
            (state.error ?: REQUEST_OFFLINE.takeIf { offline && state.actions == MyAppointmentActions.CANCEL })?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.Coral)
            }
            SheetActions(state, enabled = !offline && !state.pending, actions)
        }
    }
}

@Composable
private fun SheetActions(state: MyAppointmentSheetState, enabled: Boolean, actions: MyAppointmentSheetActions) {
    when (state.actions) {
        MyAppointmentActions.PAST -> Text(APPOINTMENT_PAST, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        MyAppointmentActions.NONE -> Unit
        MyAppointmentActions.CANCEL -> if (state.confirmingCancel) {
            Text(cancelMyQuestion(state.appointment.at), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
            ButtonRow {
                OutlinedButton(onClick = actions.onBack, enabled = !state.pending, modifier = Touch) { Text(CANCEL_BACK) }
                Button(
                    onClick = actions.onCancelConfirmed,
                    enabled = enabled,
                    modifier = Touch,
                    colors = ButtonDefaults.buttonColors(containerColor = FtColors.Coral),
                ) {
                    if (state.pending) CircularProgressIndicator(Modifier.size(18.dp), color = FtColors.TextPrimary, strokeWidth = 2.dp)
                    else Text(CANCEL_YES)
                }
            }
        } else {
            ButtonRow {
                OutlinedButton(onClick = actions.onAskCancel, enabled = enabled, modifier = Touch) { Text(CANCEL_APPOINTMENT) }
            }
        }
    }
}

@Composable
private fun ButtonRow(content: @Composable () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.md, Alignment.End)) { content() }
}

/** Alto mínimo de toque de los botones de la hoja. */
private val Touch = Modifier.heightIn(min = Spacing.minTouchTarget)
