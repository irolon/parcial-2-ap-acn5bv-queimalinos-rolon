package com.fittrainer.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Star
import androidx.compose.ui.graphics.vector.ImageVector
import com.fittrainer.ui.routines.detail.ROUTINE_ID_ARG

/** Una pestaña de la barra inferior. isAccountMenu = la que lleva a Estado del servidor y Cerrar sesión. */
data class Tab(val route: String, val label: String, val icon: ImageVector, val isAccountMenu: Boolean = false)

const val HEALTH_ROUTE = "health"
const val STUDENT_TODAY_ROUTE = "student/today"
const val STUDENT_ROUTINES_ROUTE = "student/routines"
const val STUDENT_PROGRESS_ROUTE = "student/progress"

/** Detalle de una sesión del historial (tarjeta 12). */
const val HISTORY_DETAIL_ROUTE = "student/history/{sessionId}"
fun historyDetailRoute(sessionId: String) = "student/history/$sessionId"

/** Mis rutinas → una rutina, y Mis rutinas → biblioteca (la biblioteca no cuelga de student/routines/ para no chocar con {routineId}). */
const val ROUTINE_DETAIL_ROUTE = "student/routines/{$ROUTINE_ID_ARG}"
fun routineDetailRoute(routineId: String) = "student/routines/$routineId"
const val STUDENT_LIBRARY_ROUTE = "student/library"

/** Las pantallas hijas dejan marcada su pestaña: el historial cuelga de Progreso; el detalle y la biblioteca, de Mis rutinas. */
fun isTabSelected(tabRoute: String, currentRoute: String?): Boolean =
    currentRoute == tabRoute || (currentRoute != null && parentTab(currentRoute) == tabRoute)

private fun parentTab(route: String): String? = when {
    route.startsWith("student/history/") -> STUDENT_PROGRESS_ROUTE
    route.startsWith("$STUDENT_ROUTINES_ROUTE/") || route == STUDENT_LIBRARY_ROUTE -> STUDENT_ROUTINES_ROUTE
    else -> null
}

/** Sesión activa: pantalla completa, sin la barra de pestañas. */
const val WORKOUT_ROUTE = "student/workout"

/** Guía Mobile p.5 — app del alumno. */
val StudentTabs = listOf(
    Tab(STUDENT_TODAY_ROUTE, "Hoy", Icons.Filled.DateRange),
    Tab(STUDENT_PROGRESS_ROUTE, "Progreso", Icons.Filled.Star),
    Tab(STUDENT_ROUTINES_ROUTE, "Mis rutinas", Icons.AutoMirrored.Filled.List),
    Tab("student/profile", "Perfil", Icons.Filled.Person, isAccountMenu = true),
)

/** Guía Mobile p.5 — app del entrenador. */
val TrainerTabs = listOf(
    Tab("trainer/home", "Inicio", Icons.Filled.Home),
    Tab("trainer/students", "Alumnos", Icons.Filled.Face),
    Tab("trainer/messages", "Mensajes", Icons.Filled.Email),
    Tab("trainer/more", "Más", Icons.Filled.Menu, isAccountMenu = true),
)
