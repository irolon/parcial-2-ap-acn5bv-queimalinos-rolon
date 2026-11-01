package com.fittrainer.ui.workout.components.exit

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.workout.missingSetsMessage

enum class ExitStep { Menu, ConfirmFinish, ConfirmDiscard }

/** ✕ de la sesión (spec §3): hoja con terminar (confirma si faltan series), seguir o descartar (confirma). */
@Composable
fun ExitMenu(
    step: ExitStep,
    pendingSets: Int,
    progress: String,
    onStep: (ExitStep?) -> Unit,
    onFinish: () -> Unit,
    onDiscard: () -> Unit,
) {
    when (step) {
        ExitStep.Menu -> ExitSheet(
            progress,
            onDismiss = { onStep(null) },
            onFinish = { if (pendingSets > 0) onStep(ExitStep.ConfirmFinish) else onFinish() },
            onDiscard = { onStep(ExitStep.ConfirmDiscard) },
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
