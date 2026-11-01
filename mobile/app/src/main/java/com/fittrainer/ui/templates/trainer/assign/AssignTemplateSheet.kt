package com.fittrainer.ui.templates.trainer.assign

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fittrainer.data.routines.trainer.RoutineField
import com.fittrainer.data.routines.trainer.WEEK_DAYS
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.routines.trainer.components.CheckRow
import com.fittrainer.ui.routines.trainer.create.DEACTIVATE_CURRENT
import com.fittrainer.ui.routines.trainer.dayChip
import com.fittrainer.ui.templates.trainer.PREVIOUS_LOADING
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Hoja "Asignar": alumno, nombre, días y "Desactivar la rutina actual". Sin red, "Asignar" queda deshabilitado. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AssignTemplateSheet(
    state: AssignState,
    offline: Boolean,
    onPickStudent: () -> Unit,
    onName: (String) -> Unit,
    onToggleDay: (String) -> Unit,
    onToggleDeactivate: (Boolean) -> Unit,
    onSubmit: () -> Unit,
    onRetryPrevious: () -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            Text("Asignar plantilla", style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            (state.message ?: NEEDS_NETWORK.takeIf { offline })?.let { Text(it, color = FtColors.Coral) }
            val on = !state.submitting && !offline
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(state.student?.name ?: "Sin alumno", Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
                if (!state.fixedStudent) {
                    TextButton(onClick = onPickStudent, enabled = !state.submitting, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Cambiar") }
                }
            }
            OutlinedTextField(
                value = state.name,
                onValueChange = onName,
                modifier = Modifier.fillMaxWidth(),
                enabled = on,
                label = { Text("Nombre de la rutina") },
                isError = state.errors[RoutineField.NAME] != null,
                supportingText = state.errors[RoutineField.NAME]?.let { { Text(it) } },
                singleLine = true,
            )
            Text("DÍAS", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
            state.errors[RoutineField.DAYS]?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.Coral) }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                WEEK_DAYS.forEach { day ->
                    FilterChip(
                        selected = day in state.days,
                        onClick = { onToggleDay(day) },
                        enabled = on,
                        label = { Text(dayChip(day)) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = FtColors.Brand, selectedLabelColor = Color.White),
                        modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
                    )
                }
            }
            when (state.previous) {
                PreviousRoutines.LOADING -> if (state.student != null) {
                    Text(PREVIOUS_LOADING, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
                }
                PreviousRoutines.FAILED -> TextButton(onClick = onRetryPrevious, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                    Text("Reintentar")
                }
                PreviousRoutines.READY -> Unit
            }
            if (state.showDeactivate) {
                CheckRow(DEACTIVATE_CURRENT, state.deactivateCurrent, enabled = on, onChange = onToggleDeactivate)
            }
            Button(onClick = onSubmit, enabled = on && state.canSubmit, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                Text(if (state.submitting) "Asignando…" else "Asignar")
            }
        }
    }
}
