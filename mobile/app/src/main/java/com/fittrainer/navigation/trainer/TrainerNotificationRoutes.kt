package com.fittrainer.navigation.trainer

import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fittrainer.navigation.trainerStudentDetailRoute
import com.fittrainer.ui.notifications.NotificationsScreen
import com.fittrainer.ui.notifications.launch.NotificationLaunchViewModel
import com.fittrainer.ui.students.overview.pending.PendingTodayViewModel
import com.fittrainer.ui.students.overview.pending.pendingTodayItems

/** Centro de notificaciones del entrenador (E12): cuelga de Inicio, como el del alumno de Hoy. */
const val TRAINER_NOTIFICATIONS_ROUTE = "trainer/notifications"

/** Centro de avisos del entrenador (E12): los avisos y, arriba, los pendientes de hoy que antes abría la campana. */
fun NavGraphBuilder.trainerNotificationRoutes(navController: NavHostController, launches: NotificationLaunchViewModel) {
    composable(TRAINER_NOTIFICATIONS_ROUTE) {
        val pendingVm: PendingTodayViewModel = hiltViewModel()
        val pending by pendingVm.pending.collectAsStateWithLifecycle()
        LaunchedEffect(pendingVm) { pendingVm.onStart() }
        NotificationsScreen(
            onBack = { navController.popBackStack() },
            onOpen = launches::open,
            header = {
                pendingTodayItems(pending) { id -> navController.navigate(trainerStudentDetailRoute(id)) { launchSingleTop = true } }
            },
        )
    }
}
