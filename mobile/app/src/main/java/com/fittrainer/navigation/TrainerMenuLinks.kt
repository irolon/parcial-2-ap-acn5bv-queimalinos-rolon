package com.fittrainer.navigation

import androidx.navigation.NavHostController
import com.fittrainer.ui.placeholder.MenuLink

/** Accesos de la pestaña Más del entrenador. E9: Plantillas (E10 suma Biblioteca y E14 Desafíos). */
fun trainerMenuLinks(navController: NavHostController): List<MenuLink> = listOf(
    MenuLink("Plantillas") { navController.navigate(TRAINER_TEMPLATES_ROUTE) { launchSingleTop = true } },
)
