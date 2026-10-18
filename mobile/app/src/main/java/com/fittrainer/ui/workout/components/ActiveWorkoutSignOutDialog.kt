package com.fittrainer.ui.workout.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable

/** Spec §4: las sesiones no se borran en el logout; la abierta se termina antes de salir. */
@Composable
fun ActiveWorkoutSignOutDialog(onFinishAndSignOut: () -> Unit, onCancel: () -> Unit) {
    AlertDialog(
        onDismissRequest = onCancel,
        title = { Text("Tenés una sesión en curso") },
        text = { Text("Para cerrar sesión hay que terminarla. Lo que registraste queda guardado.") },
        confirmButton = { TextButton(onClick = onFinishAndSignOut) { Text("Terminarla y salir") } },
        dismissButton = { TextButton(onClick = onCancel) { Text("Cancelar") } },
    )
}

/** No se pudo terminar la sesión: la cuenta sigue abierta y el alumno se entera acá mismo. */
@Composable
fun SignOutFailedDialog(message: String, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("No pudimos cerrar sesión") },
        text = { Text(message) },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Entendido") } },
    )
}
