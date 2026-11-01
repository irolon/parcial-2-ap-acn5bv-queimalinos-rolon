package com.fittrainer.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import com.fittrainer.ui.notifications.NotificationsScreen
import com.fittrainer.ui.notifications.launch.NotificationLaunchViewModel
import com.fittrainer.ui.students.overview.pending.PendingTodayViewModel
import com.fittrainer.ui.students.overview.pending.pendingTodayItems

/** Centro de avisos del entrenador (E12): los avisos y, arriba, los pendientes de hoy que antes abría la campana. */
@Composable
fun TrainerNotificationsRoute(navController: NavHostController, launches: NotificationLaunchViewModel) {
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
