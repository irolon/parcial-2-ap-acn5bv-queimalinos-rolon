package com.fittrainer.ui.routines.trainer.section

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.routines.trainer.ASSIGN_ROUTINE
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** "Asignar rutina" de la ficha (E8 + E9): el botón abre una hoja con "Rutina nueva" y "Desde plantilla". */
@Composable
fun AssignRoutineAction(enabled: Boolean, onNew: () -> Unit, onFromTemplate: () -> Unit) {
    var open by remember { mutableStateOf(false) }
    AssignRoutineButton(enabled) { open = true }
    if (open) {
        AssignChoiceSheet(
            onNew = { open = false; onNew() },
            onFromTemplate = { open = false; onFromTemplate() },
            onDismiss = { open = false },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AssignChoiceSheet(onNew: () -> Unit, onFromTemplate: () -> Unit, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(Spacing.lg), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text(ASSIGN_ROUTINE, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            OutlinedButton(onClick = onNew, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text("Rutina nueva") }
            OutlinedButton(onClick = onFromTemplate, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text("Desde plantilla") }
        }
    }
}
