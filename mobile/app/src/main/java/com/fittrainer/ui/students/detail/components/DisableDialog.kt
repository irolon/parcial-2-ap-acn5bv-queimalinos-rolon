package com.fittrainer.ui.students.detail.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import com.fittrainer.ui.students.detail.DISABLE_TEXT
import com.fittrainer.ui.theme.FtColors

@Composable
fun DisableDialog(name: String, onConfirm: () -> Unit, onCancel: () -> Unit) {
    AlertDialog(
        onDismissRequest = onCancel,
        title = { Text("¿Dar de baja a $name?") },
        text = { Text(DISABLE_TEXT) },
        confirmButton = { TextButton(onClick = onConfirm) { Text("Dar de baja", color = FtColors.Coral) } },
        dismissButton = { TextButton(onClick = onCancel) { Text("Cancelar") } },
    )
}
