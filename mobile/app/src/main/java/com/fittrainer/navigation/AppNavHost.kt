package com.fittrainer.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.session.Session
import com.fittrainer.ui.login.LoginScreen

/** Ramifica por rol desde la raíz: cada rol tiene su propia barra de pestañas. */
@Composable
fun AppNavHost(viewModel: RootViewModel = hiltViewModel()) {
    val session by viewModel.session.collectAsStateWithLifecycle()
    val signOutWarning by viewModel.signOutWarning.collectAsStateWithLifecycle()
    when (session) {
        null -> Box(Modifier.fillMaxSize()) // leyendo la sesión guardada
        Session.LoggedOut -> LoginScreen(
            warning = signOutWarning,
            onDismissWarning = viewModel::dismissSignOutWarning,
        )
        is Session.Student -> RoleShell(tabs = StudentTabs, onSignOut = viewModel::signOut)
        is Session.Trainer -> RoleShell(tabs = TrainerTabs, onSignOut = viewModel::signOut)
    }
}
