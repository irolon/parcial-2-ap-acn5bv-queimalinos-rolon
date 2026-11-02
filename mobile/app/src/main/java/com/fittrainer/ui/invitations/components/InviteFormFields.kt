package com.fittrainer.ui.invitations.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.fittrainer.data.invitation.invite.GOALS
import com.fittrainer.data.invitation.invite.InviteField
import com.fittrainer.data.invitation.invite.LEVELS
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.invitations.INVITE_MORE
import com.fittrainer.ui.invitations.INVITE_NEEDS_NETWORK
import com.fittrainer.ui.invitations.INVITE_SUBMIT
import com.fittrainer.ui.invitations.InviteUiState
import com.fittrainer.ui.invitations.InviteViewModel
import com.fittrainer.ui.invitations.levelLabel
import com.fittrainer.ui.join.goalLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

@Composable
fun InviteFormFields(state: InviteUiState.Editing, vm: InviteViewModel) {
    val form = state.form
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        if (state.offline) OfflineIndicator(INVITE_NEEDS_NETWORK)
        state.notice?.let { NoticeBanner(it, vm::dismissNotice) }
        LabeledField("NOMBRE Y APELLIDO", form.name, state.errors[InviteField.NAME]) { vm.onChange(InviteField.NAME, it) }
        LabeledField("EMAIL", form.email, state.errors[InviteField.EMAIL], KeyboardType.Email) { vm.onChange(InviteField.EMAIL, it) }
        OptionPicker("OBJETIVO", form.goal, GOALS, ::goalLabel, state.errors[InviteField.GOAL]) { vm.onChange(InviteField.GOAL, it) }
        OptionPicker("NIVEL", form.level, LEVELS, ::levelLabel, state.errors[InviteField.LEVEL]) { vm.onChange(InviteField.LEVEL, it) }
        TextButton(onClick = vm::onToggleMore, modifier = Modifier.height(Spacing.minTouchTarget)) {
            Text(if (state.showMore) "Ocultar más datos" else "$INVITE_MORE (teléfono, equipamiento, lesiones)")
        }
        if (state.showMore) {
            LabeledField(
                "TELÉFONO (PARA WHATSAPP)", form.phone, state.errors[InviteField.PHONE], KeyboardType.Phone,
            ) { vm.onChange(InviteField.PHONE, it) }
            EquipmentChips(form.equipment, state.errors[InviteField.EQUIPMENT], vm::onAddEquipment, vm::onRemoveEquipment)
            LabeledField("LESIONES", form.injuries, state.errors[InviteField.INJURIES], singleLine = false) {
                vm.onChange(InviteField.INJURIES, it)
            }
        }
        Button(
            onClick = vm::onSubmit,
            enabled = state.canSubmit,
            modifier = Modifier.fillMaxWidth().height(56.dp),
        ) {
            if (state.sending) {
                CircularProgressIndicator(Modifier.size(20.dp), color = FtColors.TextPrimary, strokeWidth = 2.dp)
            } else {
                Text(INVITE_SUBMIT)
            }
        }
    }
}

@Composable
fun FieldLabel(text: String) {
    Text(text, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
}

@Composable
private fun LabeledField(
    label: String,
    value: String,
    error: String?,
    keyboard: KeyboardType = KeyboardType.Text,
    singleLine: Boolean = true,
    onChange: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        FieldLabel(label)
        OutlinedTextField(
            value = value,
            onValueChange = onChange,
            modifier = Modifier.fillMaxWidth(),
            isError = error != null,
            supportingText = error?.let { { Text(it) } },
            singleLine = singleLine,
            minLines = if (singleLine) 1 else 3,
            keyboardOptions = KeyboardOptions(keyboardType = keyboard),
        )
    }
}
