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

/** Sesión activa: pantalla completa, sin la barra de pestañas. */
const val WORKOUT_ROUTE = "student/workout"

/** Guía Mobile p.5 — app del alumno. */
val StudentTabs = listOf(
    Tab(STUDENT_TODAY_ROUTE, "Hoy", Icons.Filled.DateRange),
    Tab("student/progress", "Progreso", Icons.Filled.Star),
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
