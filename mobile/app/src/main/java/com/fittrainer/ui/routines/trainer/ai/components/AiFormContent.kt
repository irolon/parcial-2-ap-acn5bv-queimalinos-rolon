package com.fittrainer.ui.routines.trainer.ai.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.data.invitation.invite.LEVELS
import com.fittrainer.ui.components.levelLabel
import com.fittrainer.ui.join.goalLabel
import com.fittrainer.ui.routines.trainer.ai.AI_PRIVACY
import com.fittrainer.ui.routines.trainer.ai.AiField
import com.fittrainer.ui.routines.trainer.ai.AiRoutineUiState
import com.fittrainer.ui.routines.trainer.ai.AiRoutineViewModel
import com.fittrainer.ui.routines.trainer.ai.DURATIONS
import com.fittrainer.ui.routines.trainer.ai.GOALS
import com.fittrainer.ui.routines.trainer.ai.MAX_TEXT
import com.fittrainer.ui.routines.trainer.ai.durationLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** El formulario del asistente (E15). Bloqueado mientras genera. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AiFormContent(state: AiRoutineUiState, vm: AiRoutineViewModel) {
    val on = !state.generating
    val f = state.form
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        ChipGroup("Objetivo", GOALS, f.goal, ::goalLabel, state.fieldErrors[AiField.GOAL], on, vm::onGoal)
        ChipGroup("Nivel", LEVELS, f.level, { levelLabel(it).orEmpty() }, state.fieldErrors[AiField.LEVEL], on, vm::onLevel)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text("Días por semana", color = FtColors.TextPrimary, modifier = Modifier.weight(1f))
            OutlinedButton(onClick = { vm.onDays(f.daysPerWeek - 1) }, enabled = on && f.daysPerWeek > 1) { Text("−") }
            Text("${f.daysPerWeek}", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            OutlinedButton(onClick = { vm.onDays(f.daysPerWeek + 1) }, enabled = on && f.daysPerWeek < 7) { Text("+") }
        }
        state.fieldErrors[AiField.DAYS]?.let { Text(it, color = FtColors.Coral) }
        ChipGroup("Duración", DURATIONS, f.durationMin, ::durationLabel, state.fieldErrors[AiField.DURATION], on, vm::onDuration)
        EquipmentField(state.profileEquipment, f.equipment, on, vm::onChangeEquipment, vm::onToggleEquipment, vm::onUseProfileEquipment)
        state.fieldErrors[AiField.EQUIPMENT]?.let { Text(it, color = FtColors.Coral) }
        TextBox("Lesiones", f.injuries, state.fieldErrors[AiField.INJURIES], on, vm::onInjuries)
        TextBox("Preferencias (opcional)", f.preferences, state.fieldErrors[AiField.PREFERENCES], on, vm::onPreferences)
        Text(AI_PRIVACY, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun <T> ChipGroup(title: String, options: List<T>, selected: T?, label: (T) -> String, error: String?, enabled: Boolean, onPick: (T) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Text(title, style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            options.forEach { o -> FilterChip(selected = o == selected, onClick = { onPick(o) }, enabled = enabled, label = { Text(label(o)) }) }
        }
        error?.let { Text(it, color = FtColors.Coral) }
    }
}

@Composable
private fun TextBox(label: String, value: String, error: String?, enabled: Boolean, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value, onValueChange = onChange, enabled = enabled, label = { Text(label) }, isError = error != null,
        supportingText = { Text(error ?: "${value.length}/$MAX_TEXT") }, modifier = Modifier.fillMaxWidth(), minLines = 2,
    )
}
