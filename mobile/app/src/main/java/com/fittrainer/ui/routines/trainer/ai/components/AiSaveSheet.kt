package com.fittrainer.ui.routines.trainer.ai.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import com.fittrainer.ui.routines.trainer.ai.AI_SAVE_ASSIGN
import com.fittrainer.ui.routines.trainer.ai.AI_TEMPLATE_NAME
import com.fittrainer.ui.routines.trainer.ai.AiRoutineUiState
import com.fittrainer.ui.routines.trainer.ai.AiRoutineViewModel
import com.fittrainer.ui.routines.trainer.ai.blocksNameHint
import com.fittrainer.ui.routines.trainer.components.CheckRow
import com.fittrainer.ui.routines.trainer.create.deactivateLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** "Guardar y asignar" (E15): nombre de la plantilla, pausar las de antes, progreso y "Reintentar". */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiSaveSheet(state: AiRoutineUiState, vm: AiRoutineViewModel) {
    val sheet = state.sheet ?: return
    val a = state.assign
    // Con progreso (aunque haya fallado) el nombre y el check ya no se editan: el reintento usa lo guardado.
    val locked = a.running || state.assignStarted
    val running by rememberUpdatedState(a.running)
    // Mientras asigna no se cierra (deslizando, tocando afuera ni con atrás): el avance y las fallas se ven acá.
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true, confirmValueChange = { it != SheetValue.Hidden || !running })
    ModalBottomSheet(onDismissRequest = vm::onDismissSave, sheetState = sheetState) {
        Column(Modifier.fillMaxWidth().padding(Spacing.lg), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text(AI_SAVE_ASSIGN, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            OutlinedTextField(
                value = sheet.name, onValueChange = vm::onTemplateName, enabled = !locked, label = { Text(AI_TEMPLATE_NAME) },
                isError = sheet.nameError != null, supportingText = sheet.nameError?.let { { Text(it) } }, modifier = Modifier.fillMaxWidth(),
            )
            if ((state.proposal?.blocks?.size ?: 0) > 1) Text(blocksNameHint(sheet.name), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
            if (state.activeRoutines.isNotEmpty()) {
                CheckRow(deactivateLabel(state.activeRoutines.map { it.name }), sheet.deactivate, enabled = !locked, onChange = vm::onToggleDeactivate)
            }
            if (a.running) Text("Asignando… ${a.assigned} de ${a.total}", color = FtColors.TextSecondary)
            a.message?.let { Text(it, color = FtColors.Coral) }
            val label = if (a.canRetry) "Reintentar" else AI_SAVE_ASSIGN
            Button(
                onClick = vm::onSaveAndAssign, enabled = !a.running && (a.canRetry || a.message == null),
                modifier = Modifier.fillMaxWidth().height(52.dp), colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
            ) { Text(label) }
        }
    }
}
