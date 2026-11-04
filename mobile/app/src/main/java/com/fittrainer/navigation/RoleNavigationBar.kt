package com.fittrainer.navigation

import androidx.compose.foundation.layout.offset
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import androidx.navigation.NavGraph.Companion.findStartDestination
import com.fittrainer.navigation.trainer.TRAINER_MESSAGES_ROUTE
import com.fittrainer.ui.messages.student.badge.StudentMessagesBadgeViewModel
import com.fittrainer.ui.messages.trainer.badge.MessagesBadgeViewModel
import com.fittrainer.ui.messages.trainer.unreadDescription
import com.fittrainer.ui.notifications.bell.NotificationBellViewModel
import com.fittrainer.ui.workout.history.badge.ProgressBadgeViewModel
import com.fittrainer.ui.workout.history.unreadBadgeDescription
import com.fittrainer.ui.workout.history.unreadBadgeText

/**
 * Comentarios del entrenador sin leer (badge de Progreso). Solo el shell del alumno pide el ViewModel:
 * `isStudent` no cambia en la vida del shell, así que el hiltViewModel condicional es estable.
 */
@Composable
fun progressUnread(isStudent: Boolean): Int {
    if (!isStudent) return 0
    val badge: ProgressBadgeViewModel = hiltViewModel()
    LifecycleStartEffect(badge) {
        badge.onAppStart()
        onStopOrDispose {}
    }
    return badge.unread.collectAsStateWithLifecycle().value
}

/** Un globito de pestaña: el número y lo que lee TalkBack. */
class TabBadge(val count: Int, val description: String)

/** Los globitos del rol: comentarios sin leer en Progreso (alumno) y mensajes sin leer en Mensajes (los dos roles: E11 y tarjeta 18). */
@Composable
fun tabBadges(isStudent: Boolean): Map<String, TabBadge> {
    val comments = progressUnread(isStudent)
    val messages = messagesUnread(isStudent)
    return buildMap {
        put(STUDENT_PROGRESS_ROUTE, TabBadge(comments, unreadBadgeDescription(comments)))
        put(if (isStudent) STUDENT_MESSAGES_ROUTE else TRAINER_MESSAGES_ROUTE, messages)
    }
}

/**
 * Mensajes sin leer, con polling mientras la app está en primer plano: los de los alumnos para el PT (E11) y los del
 * PT para el alumno (tarjeta 18). Mismo criterio que [progressUnread]: `isStudent` no cambia en la vida del shell.
 */
@Composable
fun messagesUnread(isStudent: Boolean): TabBadge {
    val count = if (isStudent) studentMessagesUnread() else trainerMessagesUnread()
    return TabBadge(count, unreadDescription(count))
}

@Composable
private fun trainerMessagesUnread(): Int {
    val badge: MessagesBadgeViewModel = hiltViewModel()
    LifecycleStartEffect(badge) {
        badge.onForeground()
        onStopOrDispose { badge.onBackground() }
    }
    return badge.unread.collectAsStateWithLifecycle().value
}

@Composable
private fun studentMessagesUnread(): Int {
    val badge: StudentMessagesBadgeViewModel = hiltViewModel()
    LifecycleStartEffect(badge) {
        badge.onForeground()
        onStopOrDispose { badge.onBackground() }
    }
    return badge.unread.collectAsStateWithLifecycle().value
}

/** Avisos sin leer: la campana de Hoy (alumno) y la del Inicio (entrenador, E12). */
@Composable
fun notificationsUnread(): Int {
    val bell: NotificationBellViewModel = hiltViewModel()
    LifecycleStartEffect(bell) {
        bell.onAppStart()
        onStopOrDispose {}
    }
    return bell.unread.collectAsStateWithLifecycle().value
}

/** Barra de pestañas del rol. backStack: las rutas de abajo hacia arriba. badges: el globito rojo de cada pestaña que lo lleva (Progreso del alumno y Mensajes de los dos roles). */
@Composable
fun RoleNavigationBar(tabs: List<Tab>, backStack: List<String?>, navController: NavController, badges: Map<String, TabBadge>) {
    val routes = tabs.map { it.route }
    val selected = selectedTab(routes, backStack)
    NavigationBar {
        tabs.forEach { tab ->
            NavigationBarItem(
                selected = tab.route == selected,
                onClick = {
                    when (val action = tabAction(tab.route, routes, backStack)) {
                        TabAction.None -> Unit
                        is TabAction.PopTo -> navController.popBackStack(action.route, inclusive = false)
                        is TabAction.Navigate -> navController.navigate(action.route) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = action.restoreState
                        }
                    }
                },
                icon = {
                    val tabBadge = badges[tab.route]?.takeIf { it.count > 0 }
                    if (tabBadge != null) {
                        // Corrido hacia arriba y a la derecha: así no tapa el ícono.
                        val badge = Modifier.offset(x = 8.dp, y = (-6).dp).clearAndSetSemantics { contentDescription = tabBadge.description }
                        BadgedBox(badge = { Badge(badge) { Text(unreadBadgeText(tabBadge.count)) } }) { Icon(tab.icon, contentDescription = null) }
                    } else {
                        Icon(tab.icon, contentDescription = null)
                    }
                },
                label = { Text(tab.label, maxLines = 1) },
            )
        }
    }
}
