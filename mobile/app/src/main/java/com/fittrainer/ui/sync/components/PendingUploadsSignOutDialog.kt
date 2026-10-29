package com.fittrainer.ui.sync.components

import androidx.compose.foundation.layout.Row
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import com.fittrainer.ui.sync.SignOutSyncState
import com.fittrainer.ui.sync.signOutPendingText

/** Spec §6: las sesiones no se pierden en el logout; se ofrece subirlas antes de salir. */
@Composable
fun PendingUploadsSignOutDialog(
    state: SignOutSyncState,
    onUpload: () -> Unit,
    onSignOutAnyway: () -> Unit,
    onCancel: () -> Unit,
) {
    when (state) {
        SignOutSyncState.Hidden -> Unit
        is SignOutSyncState.Asking -> AlertDialog(
            onDismissRequest = onCancel,
            title = { Text("Entrenamientos sin subir") },
            text = { Text(signOutPendingText(state.pending)) },
            confirmButton = { TextButton(onClick = onUpload) { Text("Subir ahora") } },
            dismissButton = {
                Row {
                    TextButton(onClick = onCancel) { Text("Cancelar") }
                    TextButton(onClick = onSignOutAnyway) { Text("Cerrar igual") }
                }
            },
        )
        SignOutSyncState.Uploading -> AlertDialog(
            onDismissRequest = {},
            title = { Text("Subiendo entrenamientos…") },
            text = { CircularProgressIndicator() },
            confirmButton = {},
        )
        is SignOutSyncState.Failed -> AlertDialog(
            onDismissRequest = onCancel,
            title = { Text("No se pudo subir") },
            text = { Text("¿Cerrar sesión igual? ${signOutPendingText(state.pending)}") },
            confirmButton = { TextButton(onClick = onUpload) { Text("Reintentar") } },
            dismissButton = {
                Row {
                    TextButton(onClick = onCancel) { Text("Cancelar") }
                    TextButton(onClick = onSignOutAnyway) { Text("Cerrar igual") }
                }
            },
        )
    }
}
