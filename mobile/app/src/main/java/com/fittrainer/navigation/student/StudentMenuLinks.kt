package com.fittrainer.navigation.student

import androidx.navigation.NavHostController
import com.fittrainer.ui.agenda.student.MY_APPOINTMENTS_TITLE
import com.fittrainer.ui.placeholder.MenuLink

/** Accesos de la pestaña Perfil del alumno: Mis turnos (tarjeta 16). */
fun studentMenuLinks(navController: NavHostController): List<MenuLink> = listOf(
    MenuLink(MY_APPOINTMENTS_TITLE) { navController.navigate(STUDENT_APPOINTMENTS_ROUTE) { launchSingleTop = true } },
)
