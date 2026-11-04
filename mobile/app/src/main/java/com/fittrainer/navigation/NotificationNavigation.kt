package com.fittrainer.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import androidx.navigation.NavGraph.Companion.findStartDestination
import com.fittrainer.navigation.trainer.TRAINER_CHAT_ROUTE
import com.fittrainer.navigation.trainer.TRAINER_MESSAGES_ROUTE
import com.fittrainer.navigation.trainer.TRAINER_STUDENT_CHAT_ROUTE
import com.fittrainer.navigation.trainer.TRAINER_NOTIFICATIONS_ROUTE
import com.fittrainer.navigation.trainer.trainerChatRoute
import com.fittrainer.ui.messages.trainer.chat.CHAT_STUDENT_ARG
import com.fittrainer.ui.notifications.launch.NavTarget
import com.fittrainer.ui.notifications.launch.NotificationLaunchViewModel
import com.fittrainer.ui.notifications.launch.PendingNav
import kotlinx.coroutines.flow.first

/**
 * Un paso de navegación: ir a la raíz de una pestaña o apilar una ruta encima. [Tab.restore]: volver a la pestaña
 * como la dejó (el chat del alumno, con su borrador) en vez de abrirla de cero.
 */
sealed interface NavStep {
    data class Tab(val route: String, val restore: Boolean = false) : NavStep
    data class Push(val route: String) : NavStep
}

/**
 * Pasos para llegar al destino de un aviso. Desde un push cada destino cuelga de su pestaña (atrás vuelve a ella);
 * desde la lista el detalle de la sesión se apila sobre la lista (atrás vuelve a la lista).
 * Si ya se está en Progreso no se navega: la instancia visible aplica la solapa pedida (si se navegara, la que se
 * va consumiría el pedido y la nueva abriría en Historial). Lo mismo con el chat del entrenador ya abierto con ese
 * alumno ([currentStudentId]): recrearlo perdería el borrador que estaba escribiendo.
 */
fun navSteps(nav: PendingNav, currentRoute: String?, currentStudentId: String? = null): List<NavStep> = when (val target = nav.target) {
    is NavTarget.HistoryDetail ->
        if (nav.fromList) listOf(NavStep.Push(historyDetailRoute(target.sessionId)))
        else listOf(NavStep.Tab(STUDENT_PROGRESS_ROUTE), NavStep.Push(historyDetailRoute(target.sessionId)))
    NavTarget.ProgressHistory, is NavTarget.ProgressCharts ->
        if (currentRoute == STUDENT_PROGRESS_ROUTE) emptyList() else listOf(NavStep.Tab(STUDENT_PROGRESS_ROUTE))
    NavTarget.Notifications ->
        if (currentRoute == NOTIFICATIONS_ROUTE) emptyList()
        else listOf(NavStep.Tab(STUDENT_TODAY_ROUTE), NavStep.Push(NOTIFICATIONS_ROUTE))
    is NavTarget.TrainerSession -> {
        val session = NavStep.Push(trainerStudentSessionRoute(target.studentId, target.sessionId))
        // Desde un push: Alumnos → ficha → sesión, así atrás vuelve a la ficha.
        if (nav.fromList) listOf(session)
        else listOf(NavStep.Tab(TRAINER_STUDENTS_ROUTE), NavStep.Push(trainerStudentDetailRoute(target.studentId)), session)
    }
    is NavTarget.TrainerStudent -> {
        val profile = NavStep.Push(trainerStudentDetailRoute(target.studentId))
        if (nav.fromList) listOf(profile) else listOf(NavStep.Tab(TRAINER_STUDENTS_ROUTE), profile)
    }
    NavTarget.TrainerNotifications ->
        if (currentRoute == TRAINER_NOTIFICATIONS_ROUTE) emptyList()
        else listOf(NavStep.Tab(TRAINER_HOME_ROUTE), NavStep.Push(TRAINER_NOTIFICATIONS_ROUTE))
    NavTarget.StudentChat ->
        if (currentRoute == STUDENT_MESSAGES_ROUTE) emptyList() else listOf(NavStep.Tab(STUDENT_MESSAGES_ROUTE, restore = true))
    // Mensajes → chat, así atrás vuelve a la lista de conversaciones.
    is NavTarget.TrainerChat ->
        if (currentRoute in TRAINER_CHAT_ROUTES && currentStudentId == target.studentId) emptyList()
        else listOf(NavStep.Tab(TRAINER_MESSAGES_ROUTE), NavStep.Push(trainerChatRoute(target.studentId)))
    NavTarget.None -> emptyList()
}

/**
 * Con la sesión activa abierta (su resumen y el feedback incluidos) el destino espera: navegar la sacaría de la pila
 * y se saltearía el feedback sin que el alumno lo elija. Se navega cuando la sesión sale.
 */
private val TRAINER_CHAT_ROUTES = setOf(TRAINER_CHAT_ROUTE, TRAINER_STUDENT_CHAT_ROUTE)

fun holdsNavigation(currentRoute: String?): Boolean = currentRoute == WORKOUT_ROUTE

/** Navega al destino resuelto de un aviso tocado (push o lista) y lo da por consumido. En los dos shells (E12). */
@Composable
fun NotificationLaunchEffect(launches: NotificationLaunchViewModel, navController: NavController) {
    val target by launches.target.collectAsStateWithLifecycle()
    LaunchedEffect(target) {
        val nav = target ?: return@LaunchedEffect
        // Arranque en frío: el NavHost arma su grafo recién al medirse. Hasta que hay una entrada no se puede navegar.
        // Si la que hay es la sesión activa, se espera a la siguiente ([holdsNavigation]).
        val current = navController.currentBackStackEntryFlow.first { !holdsNavigation(it.destination.route) }
        navSteps(nav, current.destination.route, current.arguments?.getString(CHAT_STUDENT_ARG)).forEach { navController.navigateStep(it) }
        launches.onNavigated()
    }
}

private fun NavController.navigateStep(step: NavStep) {
    when (step) {
        // Como la barra, pero sin restaurar la pila guardada de la pestaña (se llega a su raíz), salvo [NavStep.Tab.restore].
        is NavStep.Tab -> navigate(step.route) {
            popUpTo(graph.findStartDestination().id) { saveState = true }
            launchSingleTop = true
            restoreState = step.restore
        }
        // Sin singleTop: el detalle es una sola ruta con argumento y singleTop reusaría la entrada de otra sesión.
        is NavStep.Push -> navigate(step.route)
    }
}
