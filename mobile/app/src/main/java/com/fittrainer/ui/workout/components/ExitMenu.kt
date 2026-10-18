package com.fittrainer.ui.workout.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.missingSetsMessage

enum class ExitStep { Menu, ConfirmFinish, ConfirmDiscard }

/** ✕ de la sesión (spec §3): terminar (confirma si faltan series), descartar (confirma) o seguir. */
@Composable
fun ExitMenu(step: ExitStep, pendingSets: Int, onStep: (ExitStep?) -> Unit, onFinish: () -> Unit, onDiscard: () -> Unit) {
    when (step) {
        ExitStep.Menu -> AlertDialog(
            onDismissRequest = { onStep(null) },
            title = { Text("¿Qué hacemos con la sesión?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    Button(
                        onClick = { if (pendingSets > 0) onStep(ExitStep.ConfirmFinish) else onFinish() },
                        modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                    ) { Text("Terminar sesión") }
                    OutlinedButton(
                        onClick = { onStep(ExitStep.ConfirmDiscard) },
                        modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                    ) { Text("Descartar sesión", color = FtColors.Coral) }
                }
            },
            confirmButton = { TextButton(onClick = { onStep(null) }) { Text("Seguir entrenando") } },
        )
        ExitStep.ConfirmFinish -> AlertDialog(
            onDismissRequest = { onStep(null) },
            text = { Text(missingSetsMessage(pendingSets)) },
            confirmButton = { TextButton(onClick = onFinish) { Text("Terminar") } },
            dismissButton = { TextButton(onClick = { onStep(null) }) { Text("Seguir entrenando") } },
        )
        ExitStep.ConfirmDiscard -> AlertDialog(
            onDismissRequest = { onStep(null) },
            title = { Text("¿Descartar la sesión?") },
            text = { Text("Se borra todo lo de esta sesión") },
            confirmButton = { TextButton(onClick = onDiscard) { Text("Descartar", color = FtColors.Coral) } },
            dismissButton = { TextButton(onClick = { onStep(null) }) { Text("Cancelar") } },
        )
    }
}
