package com.fittrainer.ui.sync.components

import androidx.compose.foundation.layout.Row
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import com.fittrainer.ui.sync.SIGN_OUT_REJECTED_TEXT
import com.fittrainer.ui.sync.SignOutSyncState
import com.fittrainer.ui.sync.signOutFailedText
import com.fittrainer.ui.sync.signOutPendingText
import com.fittrainer.ui.sync.signOutPendingTitle

/** Spec §6: las sesiones no se pierden en el logout; se ofrece subirlas antes de salir. */
@Composable
fun PendingUploadsSignOutDialog(
    state: SignOutSyncState,
    onUpload: () -> Unit,
    onSignOutAnyway: () -> Unit,
    onCancel: () -> Unit,
) {
    when (state) {
        SignOutSyncState.Hidden, SignOutSyncState.SignOut -> Unit
        is SignOutSyncState.Asking -> AlertDialog(
            onDismissRequest = onCancel,
            title = { Text(signOutPendingTitle(state.pending, state.feedback)) },
            text = { Text(signOutPendingText(state.pending, state.feedback)) },
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
            text = { Text(signOutFailedText(state.pending, state.feedback, state.rejected)) },
            confirmButton = { TextButton(onClick = onUpload) { Text("Reintentar") } },
            dismissButton = {
                Row {
                    TextButton(onClick = onCancel) { Text("Cancelar") }
                    TextButton(onClick = onSignOutAnyway) { Text("Cerrar igual") }
                }
            },
        )
        // Reintentar no cambia un rechazo: solo cerrar igual o quedarse a verlo en Hoy.
        SignOutSyncState.Rejected -> AlertDialog(
            onDismissRequest = onCancel,
            title = { Text("El servidor rechazó parte de lo subido") },
            text = { Text(SIGN_OUT_REJECTED_TEXT) },
            confirmButton = { TextButton(onClick = onSignOutAnyway) { Text("Cerrar igual") } },
            dismissButton = { TextButton(onClick = onCancel) { Text("Cancelar") } },
        )
    }
}
