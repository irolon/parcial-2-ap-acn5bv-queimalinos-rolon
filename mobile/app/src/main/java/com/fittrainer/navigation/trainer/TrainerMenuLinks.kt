package com.fittrainer.navigation.trainer

import androidx.navigation.NavHostController
import com.fittrainer.ui.placeholder.MenuLink

/** Accesos de la pestaña Más del entrenador: Plantillas (E9), Biblioteca (E10), Desafíos (E14) y Agenda (E13). */
fun trainerMenuLinks(navController: NavHostController): List<MenuLink> = listOf(
    MenuLink("Plantillas") { navController.navigate(TRAINER_TEMPLATES_ROUTE) { launchSingleTop = true } },
    MenuLink("Biblioteca") { navController.navigate(TRAINER_EXERCISES_ROUTE) { launchSingleTop = true } },
    MenuLink("Desafíos") { navController.navigate(TRAINER_CHALLENGES_ROUTE) { launchSingleTop = true } },
    MenuLink("Agenda") { navController.navigate(trainerAgendaRoute()) { launchSingleTop = true } },
)
