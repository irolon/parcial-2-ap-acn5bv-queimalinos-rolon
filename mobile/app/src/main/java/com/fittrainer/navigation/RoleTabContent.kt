package com.fittrainer.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.fittrainer.navigation.student.studentMenuLinks
import com.fittrainer.navigation.trainer.TRAINER_MESSAGES_ROUTE
import com.fittrainer.navigation.trainer.TRAINER_NOTIFICATIONS_ROUTE
import com.fittrainer.navigation.trainer.trainerChatRoute
import com.fittrainer.navigation.trainer.trainerMenuLinks
import com.fittrainer.ui.messages.student.chat.StudentChatScreen
import com.fittrainer.ui.messages.trainer.list.ConversationsScreen
import com.fittrainer.ui.notifications.launch.NotificationLaunchViewModel
import com.fittrainer.ui.placeholder.AccountMenuScreen
import com.fittrainer.ui.placeholder.PlaceholderScreen
import com.fittrainer.ui.progress.ProgressOpen
import com.fittrainer.ui.progress.ProgressScreen
import com.fittrainer.ui.routines.RoutinesScreen
import com.fittrainer.ui.students.StudentsScreen
import com.fittrainer.ui.students.overview.HomeNavigation
import com.fittrainer.ui.students.overview.TrainerHomeScreen
import com.fittrainer.ui.today.TodayScreen

/** La pantalla de una pestaña de [RoleShell] (separada para que el shell no pase de 200 líneas). */
@Composable
internal fun TabScreen(
    tab: Tab,
    navController: NavHostController,
    isStudent: Boolean,
    guardedSignOut: () -> Unit,
    openWorkout: () -> Unit,
    unreadNotifications: Int,
    progressOpen: ProgressOpen?,
    launches: NotificationLaunchViewModel,
) {
    when {
        tab.isAccountMenu -> AccountMenuScreen(
            title = tab.label,
            onServerStatus = { navController.navigate(HEALTH_ROUTE) },
            onSignOut = guardedSignOut,
            links = if (isStudent) studentMenuLinks(navController) else trainerMenuLinks(navController),
        )
        tab.route == STUDENT_TODAY_ROUTE -> TodayScreen(
            onOpenWorkout = openWorkout,
            unreadNotifications = unreadNotifications,
            onOpenNotifications = { navController.navigate(NOTIFICATIONS_ROUTE) { launchSingleTop = true } },
        )
        tab.route == STUDENT_ROUTINES_ROUTE -> RoutinesScreen(
            // Un doble toque no apila dos veces la misma pantalla.
            onOpenRoutine = { navController.navigate(routineDetailRoute(it)) { launchSingleTop = true } },
            onOpenLibrary = { navController.navigate(STUDENT_LIBRARY_ROUTE) { launchSingleTop = true } },
        )
        tab.route == STUDENT_PROGRESS_ROUTE -> ProgressScreen(
            onOpen = { navController.navigate(historyDetailRoute(it)) },
            onOpenAchievements = { navController.navigate(STUDENT_ACHIEVEMENTS_ROUTE) { launchSingleTop = true } },
            openRequest = progressOpen,
            onOpenHandled = launches::onProgressOpenHandled,
        )
        tab.route == TRAINER_STUDENTS_ROUTE -> StudentsScreen(
            onInvite = { navController.navigate(TRAINER_INVITE_ROUTE) { launchSingleTop = true } },
            onOpen = { navController.navigate(trainerStudentDetailRoute(it)) { launchSingleTop = true } },
        )
        tab.route == TRAINER_HOME_ROUTE -> TrainerHomeScreen(
            HomeNavigation(
                onStudent = { navController.navigate(trainerStudentDetailRoute(it)) { launchSingleTop = true } },
                onSession = { s, id -> navController.navigate(trainerStudentSessionRoute(s, id)) { launchSingleTop = true } },
                onInvite = { navController.navigate(TRAINER_INVITE_ROUTE) { launchSingleTop = true } },
                onNotifications = { navController.navigate(TRAINER_NOTIFICATIONS_ROUTE) { launchSingleTop = true } },
            ),
            unreadNotifications = unreadNotifications,
        )
        tab.route == STUDENT_MESSAGES_ROUTE -> StudentChatScreen()
        tab.route == TRAINER_MESSAGES_ROUTE -> ConversationsScreen(onOpen = { navController.navigate(trainerChatRoute(it)) { launchSingleTop = true } })
        else -> PlaceholderScreen(tab.label)
    }
}
