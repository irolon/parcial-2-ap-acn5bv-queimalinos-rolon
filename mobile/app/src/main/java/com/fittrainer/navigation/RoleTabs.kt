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

/** Una pestaña de la barra inferior. isAccountMenu = la que lleva a Estado del servidor y Cerrar sesión. */
data class Tab(val route: String, val label: String, val icon: ImageVector, val isAccountMenu: Boolean = false)

const val HEALTH_ROUTE = "health"
const val STUDENT_TODAY_ROUTE = "student/today"
const val STUDENT_LIBRARY_ROUTE = "student/routines"
const val STUDENT_PROGRESS_ROUTE = "student/progress"

/** Detalle de una sesión del historial (tarjeta 12). */
const val HISTORY_DETAIL_ROUTE = "student/history/{sessionId}"
fun historyDetailRoute(sessionId: String) = "student/history/$sessionId"

/** Lista de avisos del alumno (tarjeta 17): se abre desde la campana de Hoy. */
const val NOTIFICATIONS_ROUTE = "student/notifications"

/** El detalle de una sesión cuelga de Progreso y la lista de avisos, de Hoy: esa pestaña sigue marcada mientras se ven. */
fun isTabSelected(tabRoute: String, currentRoute: String?): Boolean =
    currentRoute == tabRoute ||
        (tabRoute == STUDENT_PROGRESS_ROUTE && currentRoute?.startsWith("student/history/") == true) ||
        (tabRoute == STUDENT_TODAY_ROUTE && currentRoute == NOTIFICATIONS_ROUTE)

/** Sesión activa: pantalla completa, sin la barra de pestañas. */
const val WORKOUT_ROUTE = "student/workout"

/** Guía Mobile p.5 — app del alumno. */
val StudentTabs = listOf(
    Tab(STUDENT_TODAY_ROUTE, "Hoy", Icons.Filled.DateRange),
    Tab(STUDENT_PROGRESS_ROUTE, "Progreso", Icons.Filled.Star),
    Tab(STUDENT_LIBRARY_ROUTE, "Mis rutinas", Icons.AutoMirrored.Filled.List),
    Tab("student/profile", "Perfil", Icons.Filled.Person, isAccountMenu = true),
)

/** Guía Mobile p.5 — app del entrenador. */
val TrainerTabs = listOf(
    Tab("trainer/home", "Inicio", Icons.Filled.Home),
    Tab("trainer/students", "Alumnos", Icons.Filled.Face),
    Tab("trainer/messages", "Mensajes", Icons.Filled.Email),
    Tab("trainer/more", "Más", Icons.Filled.Menu, isAccountMenu = true),
)
