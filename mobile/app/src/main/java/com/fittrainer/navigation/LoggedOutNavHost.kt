package com.fittrainer.navigation

import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.fittrainer.ui.join.ConfirmInvitationScreen
import com.fittrainer.ui.join.JoinScreen
import com.fittrainer.ui.join.TOKEN_ARG
import com.fittrainer.ui.login.LoginScreen

private const val LOGIN = "login"
private const val JOIN = "join"
private const val CONFIRM = "confirm/{$TOKEN_ARG}"
private fun confirmRoute(token: String) = "confirm/$token"

/** Navegación sin sesión: login, escanear o pegar la invitación, y confirmarla. */
@Composable
fun LoggedOutNavHost(
    warning: String?,
    onDismissWarning: () -> Unit,
    pendingToken: String?,
    onPendingConsumed: () -> Unit,
) {
    val nav = rememberNavController()

    // Deep link: va directo a confirmar, con Login debajo para que "atrás" y la X vuelvan ahí.
    LaunchedEffect(pendingToken) {
        val token = pendingToken ?: return@LaunchedEffect
        nav.navigate(confirmRoute(token)) {
            popUpTo(LOGIN)
            launchSingleTop = true
        }
        onPendingConsumed()
    }

    // Edge-to-edge: las pantallas sin sesión no manejan las barras del sistema, se aplican acá.
    NavHost(navController = nav, startDestination = LOGIN, modifier = Modifier.systemBarsPadding()) {
        composable(LOGIN) {
            LoginScreen(warning = warning, onDismissWarning = onDismissWarning, onJoin = { nav.navigate(JOIN) })
        }
        composable(JOIN) {
            JoinScreen(
                onBack = { nav.popBackStack() },
                // La cámara sigue leyendo el mismo QR durante la transición: no apilar dos confirmaciones.
                onToken = {
                    nav.navigate(confirmRoute(it)) {
                        // Que "atrás" desde confirmar vuelva a Login y no al escáner, que releería el mismo QR.
                        popUpTo(LOGIN)
                        launchSingleTop = true
                    }
                },
            )
        }
        composable(CONFIRM, arguments = listOf(navArgument(TOKEN_ARG) { type = NavType.StringType })) {
            ConfirmInvitationScreen(onClose = { nav.popBackStack(LOGIN, inclusive = false) })
        }
    }
}
