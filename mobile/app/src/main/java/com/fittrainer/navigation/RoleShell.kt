package com.fittrainer.navigation

import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
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

/** Scaffold con las 4 pestañas fijas de un rol. Máximo 2 niveles: pestaña → Estado del servidor. */
@Composable
fun RoleShell(tabs: List<Tab>, onSignOut: () -> Unit) {
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    Scaffold(
        bottomBar = {
            NavigationBar {
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
                            onSignOut = onSignOut,
                        )
                        tab.route == STUDENT_TODAY_ROUTE -> TodayScreen()
                        tab.route == STUDENT_LIBRARY_ROUTE -> LibraryScreen()
                        else -> PlaceholderScreen(tab.label)
                    }
                }
            }
            composable(HEALTH_ROUTE) {
                HealthScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}
