package com.fittrainer.navigation

import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.fittrainer.ui.health.HealthScreen
import com.fittrainer.ui.students.overview.HomeNavigation
import com.fittrainer.ui.students.overview.TrainerHomeScreen
import com.fittrainer.ui.library.LibraryScreen
import com.fittrainer.ui.placeholder.AccountMenuScreen
import com.fittrainer.ui.placeholder.PlaceholderScreen
import com.fittrainer.ui.routines.RoutinesScreen
import com.fittrainer.ui.routines.detail.RoutineDetailScreen
import com.fittrainer.ui.students.StudentsScreen
import com.fittrainer.ui.sync.SignOutSyncState
import com.fittrainer.ui.sync.SignOutSyncViewModel
import com.fittrainer.ui.sync.components.PendingUploadsSignOutDialog
import com.fittrainer.ui.today.TodayScreen
import com.fittrainer.ui.workout.WorkoutEntryViewModel
import com.fittrainer.ui.workout.WorkoutScreen
import com.fittrainer.ui.workout.components.ActiveWorkoutSignOutDialog
import com.fittrainer.ui.workout.components.SignOutFailedDialog
import com.fittrainer.ui.workout.history.HistoryScreen
import com.fittrainer.ui.workout.history.detail.HistoryDetailScreen

/** Scaffold con las 4 pestañas fijas de un rol. Máximo 2 niveles: pestaña → pantalla hija (Estado del servidor, detalle del historial, detalle de rutina, biblioteca). */
@Composable
fun RoleShell(
    tabs: List<Tab>,
    onSignOut: () -> Unit,
    entry: WorkoutEntryViewModel = hiltViewModel(),
    uploads: SignOutSyncViewModel = hiltViewModel(),
) {
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route
    val stack by navController.currentBackStack.collectAsStateWithLifecycle()
    val stackRoutes = stack.map { it.destination.route }

    val openRequested by entry.openRequests.collectAsStateWithLifecycle()
    val isStudent = tabs.any { it.route == STUDENT_TODAY_ROUTE }
    LaunchedEffect(openRequested) {
        if (openRequested) {
            if (isStudent && entry.hasActiveNow()) navController.navigate(WORKOUT_ROUTE) { launchSingleTop = true }
            entry.consumeOpenRequest()
        }
    }
    var confirmSignOut by remember { mutableStateOf(false) }
    // Antes de salir se ofrece subir lo pendiente (tarjeta 11); también después de terminar la abierta.
    val syncedSignOut: () -> Unit = uploads::request
    val guardedSignOut: () -> Unit = {
        if (isStudent) {
            entry.requestSignOut(onNoActive = syncedSignOut, onActive = { confirmSignOut = true })
        } else {
            onSignOut()
        }
    }
    if (confirmSignOut) {
        ActiveWorkoutSignOutDialog(
            onFinishAndSignOut = { confirmSignOut = false; entry.finishActive(syncedSignOut) },
            onCancel = { confirmSignOut = false },
        )
    }
    val uploadState by uploads.state.collectAsStateWithLifecycle()
    LaunchedEffect(uploadState) {
        if (uploadState == SignOutSyncState.SignOut) {
            uploads.signOutHandled()
            onSignOut()
        }
    }
    PendingUploadsSignOutDialog(uploadState, uploads::uploadNow, uploads::signOutAnyway, uploads::cancel)
    // finishActive corre en esta instancia (no en la de Hoy): si falla, el aviso se muestra acá.
    val entryError by entry.error.collectAsStateWithLifecycle()
    entryError?.let { SignOutFailedDialog(it, onDismiss = entry::dismissError) }

    val unread = progressUnread(isStudent)
    val openWorkout: () -> Unit = { navController.navigate(WORKOUT_ROUTE) { launchSingleTop = true } }
    Scaffold(
        bottomBar = {
            if (currentRoute != WORKOUT_ROUTE) RoleNavigationBar(tabs, stackRoutes, navController, unread)
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
                            links = if (isStudent) emptyList() else trainerMenuLinks(navController),
                        )
                        tab.route == STUDENT_TODAY_ROUTE -> TodayScreen(onOpenWorkout = openWorkout)
                        tab.route == STUDENT_ROUTINES_ROUTE -> RoutinesScreen(
                            // Un doble toque no apila dos veces la misma pantalla.
                            onOpenRoutine = { navController.navigate(routineDetailRoute(it)) { launchSingleTop = true } },
                            onOpenLibrary = { navController.navigate(STUDENT_LIBRARY_ROUTE) { launchSingleTop = true } },
                        )
                        tab.route == STUDENT_PROGRESS_ROUTE -> HistoryScreen(onOpen = { navController.navigate(historyDetailRoute(it)) })
                        tab.route == TRAINER_STUDENTS_ROUTE -> StudentsScreen(
                            onInvite = { navController.navigate(TRAINER_INVITE_ROUTE) { launchSingleTop = true } },
                            onOpen = { navController.navigate(trainerStudentDetailRoute(it)) { launchSingleTop = true } },
                        )
                        tab.route == TRAINER_HOME_ROUTE -> TrainerHomeScreen(
                            HomeNavigation(
                                onStudent = { navController.navigate(trainerStudentDetailRoute(it)) { launchSingleTop = true } },
                                onSession = { s, id -> navController.navigate(trainerStudentSessionRoute(s, id)) { launchSingleTop = true } },
                                onInvite = { navController.navigate(TRAINER_INVITE_ROUTE) { launchSingleTop = true } },
                            ),
                        )
                        else -> PlaceholderScreen(tab.label)
                    }
                }
            }
            composable(HEALTH_ROUTE) {
                HealthScreen(onBack = { navController.popBackStack() })
            }
            composable(HISTORY_DETAIL_ROUTE) {
                HistoryDetailScreen(onBack = { navController.popBackStack() })
            }
            composable(ROUTINE_DETAIL_ROUTE) {
                RoutineDetailScreen(onBack = { navController.popBackStack() }, onOpenWorkout = openWorkout)
            }
            trainerStudentRoutes(navController)
            trainerRoutineRoutes(navController)
            trainerTemplateRoutes(navController)
            trainerExerciseRoutes(navController)
            trainerChallengeRoutes(navController)
            composable(STUDENT_LIBRARY_ROUTE) {
                LibraryScreen(onBack = { navController.popBackStack() })
            }
            composable(WORKOUT_ROUTE) { entry ->
                // Vuelve a donde se entró (Hoy o el detalle de una rutina). Varios disparadores pueden llamar onExit:
                // solo sale si la sesión sigue arriba, así un segundo disparo no saca también la pantalla de abajo.
                // Hoy es el inicio del grafo y siempre está abajo; el navigate es solo por si algún día no lo está.
                WorkoutScreen(onExit = {
                    if (navController.currentBackStackEntry?.id == entry.id && !navController.popBackStack()) {
                        navController.navigate(STUDENT_TODAY_ROUTE)
                    }
                })
            }
        }
    }
}
