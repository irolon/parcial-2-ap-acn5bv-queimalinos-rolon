package com.fittrainer.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import androidx.navigation.NavGraph.Companion.findStartDestination
import com.fittrainer.ui.notifications.launch.NavTarget
import com.fittrainer.ui.notifications.launch.NotificationLaunchViewModel
import com.fittrainer.ui.notifications.launch.PendingNav
import kotlinx.coroutines.flow.first

/** Un paso de navegación: ir a la raíz de una pestaña o apilar una ruta encima. */
sealed interface NavStep {
    data class Tab(val route: String) : NavStep
    data class Push(val route: String) : NavStep
}

/**
 * Pasos para llegar al destino de un aviso. Desde un push cada destino cuelga de su pestaña (atrás vuelve a ella);
 * desde la lista el detalle de la sesión se apila sobre la lista (atrás vuelve a la lista).
 * Si ya se está en Progreso no se navega: la instancia visible aplica la solapa pedida (si se navegara, la que se
 * va consumiría el pedido y la nueva abriría en Historial).
 */
fun navSteps(nav: PendingNav, currentRoute: String?): List<NavStep> = when (val target = nav.target) {
    is NavTarget.HistoryDetail ->
        if (nav.fromList) listOf(NavStep.Push(historyDetailRoute(target.sessionId)))
        else listOf(NavStep.Tab(STUDENT_PROGRESS_ROUTE), NavStep.Push(historyDetailRoute(target.sessionId)))
    NavTarget.ProgressHistory, is NavTarget.ProgressCharts ->
        if (currentRoute == STUDENT_PROGRESS_ROUTE) emptyList() else listOf(NavStep.Tab(STUDENT_PROGRESS_ROUTE))
    NavTarget.Notifications ->
        if (currentRoute == NOTIFICATIONS_ROUTE) emptyList()
        else listOf(NavStep.Tab(STUDENT_TODAY_ROUTE), NavStep.Push(NOTIFICATIONS_ROUTE))
    NavTarget.None -> emptyList()
}

/** Navega al destino resuelto de un aviso tocado (push o lista) y lo da por consumido. Solo en el shell del alumno. */
@Composable
fun NotificationLaunchEffect(launches: NotificationLaunchViewModel, navController: NavController) {
    val target by launches.target.collectAsStateWithLifecycle()
    LaunchedEffect(target) {
        val nav = target ?: return@LaunchedEffect
        // Arranque en frío: el NavHost arma su grafo recién al medirse. Hasta que hay una entrada no se puede navegar.
        val current = navController.currentBackStackEntryFlow.first()
        navSteps(nav, current.destination.route).forEach { navController.navigateStep(it) }
        launches.onNavigated()
    }
}

private fun NavController.navigateStep(step: NavStep) {
    when (step) {
        // Como la barra, pero sin restaurar la pila guardada de la pestaña: se llega a su raíz.
        is NavStep.Tab -> navigate(step.route) {
            popUpTo(graph.findStartDestination().id) { saveState = true }
            launchSingleTop = true
        }
        // Sin singleTop: el detalle es una sola ruta con argumento y singleTop reusaría la entrada de otra sesión.
        is NavStep.Push -> navigate(step.route)
    }
}
