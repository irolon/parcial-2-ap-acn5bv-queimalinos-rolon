package com.fittrainer.navigation

import androidx.navigation.NavHostController
import com.fittrainer.ui.placeholder.MenuLink

/** Accesos de la pestaña Más del entrenador: Plantillas (E9) y Biblioteca (E10). E14 suma Desafíos. */
fun trainerMenuLinks(navController: NavHostController): List<MenuLink> = listOf(
    MenuLink("Plantillas") { navController.navigate(TRAINER_TEMPLATES_ROUTE) { launchSingleTop = true } },
    MenuLink("Biblioteca") { navController.navigate(TRAINER_EXERCISES_ROUTE) { launchSingleTop = true } },
)
