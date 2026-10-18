package com.fittrainer.navigation

import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.fittrainer.ui.health.HealthScreen
import com.fittrainer.ui.library.LibraryScreen
import com.fittrainer.ui.placeholder.AccountMenuScreen
import com.fittrainer.ui.placeholder.PlaceholderScreen
import com.fittrainer.ui.today.TodayScreen
import com.fittrainer.ui.workout.WorkoutEntryViewModel
import com.fittrainer.ui.workout.WorkoutScreen
import com.fittrainer.ui.workout.components.ActiveWorkoutSignOutDialog
import com.fittrainer.ui.workout.components.SignOutFailedDialog

/** Scaffold con las 4 pestañas fijas de un rol. Máximo 2 niveles: pestaña → Estado del servidor. */
@Composable
fun RoleShell(tabs: List<Tab>, onSignOut: () -> Unit, entry: WorkoutEntryViewModel = hiltViewModel()) {
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    val openRequested by entry.openRequests.collectAsStateWithLifecycle()
    val isStudent = tabs.any { it.route == STUDENT_TODAY_ROUTE }
    LaunchedEffect(openRequested) {
        if (openRequested) {
            if (isStudent && entry.hasActiveNow()) navController.navigate(WORKOUT_ROUTE) { launchSingleTop = true }
            entry.consumeOpenRequest()
        }
    }
    var confirmSignOut by remember { mutableStateOf(false) }
    val guardedSignOut: () -> Unit = {
        if (isStudent) {
            entry.requestSignOut(onNoActive = onSignOut, onActive = { confirmSignOut = true })
        } else {
            onSignOut()
        }
    }
    if (confirmSignOut) {
        ActiveWorkoutSignOutDialog(
            onFinishAndSignOut = { confirmSignOut = false; entry.finishActive(onSignOut) },
            onCancel = { confirmSignOut = false },
        )
    }
    // finishActive corre en esta instancia (no en la de Hoy): si falla, el aviso se muestra acá.
    val entryError by entry.error.collectAsStateWithLifecycle()
    entryError?.let { SignOutFailedDialog(it, onDismiss = entry::dismissError) }

    Scaffold(
        bottomBar = {
            if (currentRoute != WORKOUT_ROUTE) NavigationBar {
                tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = currentRoute == tab.route,
                        onClick = {
                            navController.navigate(tab.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(tab.icon, contentDescription = null) },
                        label = { Text(tab.label) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = tabs.first().route,
            modifier = Modifier.padding(padding).consumeWindowInsets(padding),
        ) {
            tabs.forEach { tab ->
                composable(tab.route) {
                    when {
                        tab.isAccountMenu -> AccountMenuScreen(
                            title = tab.label,
                            onServerStatus = { navController.navigate(HEALTH_ROUTE) },
                            onSignOut = guardedSignOut,
                        )
                        tab.route == STUDENT_TODAY_ROUTE -> TodayScreen(
                            onOpenWorkout = { navController.navigate(WORKOUT_ROUTE) { launchSingleTop = true } },
                        )
                        tab.route == STUDENT_LIBRARY_ROUTE -> LibraryScreen()
                        else -> PlaceholderScreen(tab.label)
                    }
                }
            }
            composable(HEALTH_ROUTE) {
                HealthScreen(onBack = { navController.popBackStack() })
            }
            composable(WORKOUT_ROUTE) {
                WorkoutScreen(onExit = { navController.popBackStack(STUDENT_TODAY_ROUTE, inclusive = false) })
            }
        }
    }
}
