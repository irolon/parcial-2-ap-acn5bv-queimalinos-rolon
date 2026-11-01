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

/** Barra de pestañas del rol. backStack: las rutas de abajo hacia arriba. Progreso lleva el badge rojo si hay comentarios sin leer. */
@Composable
fun RoleNavigationBar(tabs: List<Tab>, backStack: List<String?>, navController: NavController, progressUnread: Int) {
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
                    if (tab.route == STUDENT_PROGRESS_ROUTE && progressUnread > 0) {
                        // Corrido hacia arriba y a la derecha: así no tapa la estrella.
                        val badge = Modifier.offset(x = 8.dp, y = (-6).dp).clearAndSetSemantics { contentDescription = unreadBadgeDescription(progressUnread) }
                        BadgedBox(badge = { Badge(badge) { Text(unreadBadgeText(progressUnread)) } }) { Icon(tab.icon, contentDescription = null) }
                    } else {
                        Icon(tab.icon, contentDescription = null)
                    }
                },
                label = { Text(tab.label) },
            )
        }
    }
}
