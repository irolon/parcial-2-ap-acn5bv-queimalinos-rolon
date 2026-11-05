package com.fittrainer.navigation.trainer

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fittrainer.ui.agenda.trainer.AgendaScreen

/** Desde Más (hereda la pestaña Más) y desde los avisos de turnos. */
const val TRAINER_AGENDA_ROUTE = "trainer/agenda"

/** Agenda del entrenador (E13): la semana en lista por día, con confirmar y cancelar. */
fun NavGraphBuilder.trainerAgendaRoutes(navController: NavHostController) {
    composable(TRAINER_AGENDA_ROUTE) { AgendaScreen(onBack = { navController.popBackStack() }) }
}
