package com.fittrainer.navigation

import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavBackStackEntry
import androidx.navigation.NavHostController
import com.fittrainer.navigation.student.studentMenuLinks
import com.fittrainer.navigation.trainer.TRAINER_MESSAGES_ROUTE
import com.fittrainer.navigation.trainer.TRAINER_NOTIFICATIONS_ROUTE
import com.fittrainer.navigation.trainer.trainerChatRoute
import com.fittrainer.navigation.trainer.trainerMenuLinks
import com.fittrainer.ui.messages.student.chat.StudentChatScreen
import com.fittrainer.ui.messages.trainer.list.ConversationsScreen
import com.fittrainer.ui.notifications.launch.NotificationLaunchViewModel
import com.fittrainer.navigation.account.accountEditRoute
import com.fittrainer.navigation.account.accountPasswordRoute
import com.fittrainer.ui.account.AccountActions
import com.fittrainer.ui.account.AccountScreen
import com.fittrainer.ui.account.PASSWORD_CHANGED_KEY
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
    entry: NavBackStackEntry,
) {
    val context = LocalContext.current
    when {
        tab.isAccountMenu -> AccountScreen(
            title = tab.label,
            actions = AccountActions(
                roleLinks = if (isStudent) studentMenuLinks(navController) else trainerMenuLinks(navController),
                onEdit = { navController.navigate(accountEditRoute(isStudent)) { launchSingleTop = true } },
                onChangePassword = { navController.navigate(accountPasswordRoute(isStudent)) { launchSingleTop = true } },
                onNotifications = { context.startActivity(appNotificationSettings(context)) },
                onServerStatus = { navController.navigate(HEALTH_ROUTE) },
                onSignOut = guardedSignOut,
            ),
            // Cambiar contraseña avisa por la entrada de navegación de la pestaña.
            passwordChanged = entry.savedStateHandle.getStateFlow(PASSWORD_CHANGED_KEY, false).collectAsStateWithLifecycle().value,
            onResultConsumed = { entry.savedStateHandle[PASSWORD_CHANGED_KEY] = false },
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

/** Los ajustes de notificaciones de la app en Android (las preferencias por tipo, #97, van en otra tarjeta). */
private fun appNotificationSettings(context: Context) =
    Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
