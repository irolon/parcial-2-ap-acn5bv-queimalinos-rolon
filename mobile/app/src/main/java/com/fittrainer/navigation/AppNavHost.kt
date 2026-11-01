package com.fittrainer.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.session.Session
import com.fittrainer.ui.notifications.launch.NotificationLaunchViewModel

/**
 * Ramifica por rol desde la raíz: cada rol tiene su propia barra de pestañas.
 * [launches] se pide acá (dueño: la actividad) para que viva sin sesión y descarte el tap de un push (tarjeta 17).
 */
@Composable
fun AppNavHost(viewModel: RootViewModel = hiltViewModel(), launches: NotificationLaunchViewModel = hiltViewModel()) {
    val session by viewModel.session.collectAsStateWithLifecycle()
    val signOutWarning by viewModel.signOutWarning.collectAsStateWithLifecycle()
    val pendingToken by viewModel.pendingInvitation.collectAsStateWithLifecycle()
    val invitationWhileLoggedIn by viewModel.invitationWhileLoggedIn.collectAsStateWithLifecycle()
    when (session) {
        null -> Box(Modifier.fillMaxSize()) // leyendo la sesión guardada
        Session.LoggedOut -> LoggedOutNavHost(
            warning = signOutWarning,
            onDismissWarning = viewModel::dismissSignOutWarning,
            pendingToken = pendingToken,
            onPendingConsumed = viewModel::consumePendingInvitation,
        )
        is Session.Student -> RoleShell(tabs = StudentTabs, onSignOut = viewModel::signOut, launches = launches)
        is Session.Trainer -> RoleShell(tabs = TrainerTabs, onSignOut = viewModel::signOut, launches = launches)
    }
    if (invitationWhileLoggedIn) {
        AlertDialog(
            onDismissRequest = viewModel::dismissPendingInvitation,
            text = { Text("Ya hay una sesión iniciada en este celular. Cerrá sesión para usar la invitación.") },
            confirmButton = { TextButton(onClick = viewModel::dismissPendingInvitation) { Text("Entendido") } },
        )
    }
}
