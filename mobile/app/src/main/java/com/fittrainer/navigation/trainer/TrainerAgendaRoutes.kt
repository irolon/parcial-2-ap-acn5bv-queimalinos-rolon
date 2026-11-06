package com.fittrainer.navigation.trainer

import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.fittrainer.data.agenda.weekStartOfDay
import com.fittrainer.ui.agenda.trainer.AGENDA_WEEK_ARG
import com.fittrainer.ui.agenda.trainer.AgendaScreen
import java.time.LocalDate

/** Desde Más (hereda la pestaña Más) y desde los avisos de turnos, con la semana del turno si la trae. */
const val TRAINER_AGENDA_ROUTE = "trainer/agenda?$AGENDA_WEEK_ARG={$AGENDA_WEEK_ARG}"

/** Con la agenda ya abierta, un aviso deja acá la semana a mostrar (en la entrada, no en el ViewModel). */
const val AGENDA_SHOW_WEEK_KEY = "agenda_show_week"

/** Sin [weekStart] abre en la semana actual. */
fun trainerAgendaRoute(weekStart: LocalDate? = null): String =
    if (weekStart == null) "trainer/agenda" else "trainer/agenda?$AGENDA_WEEK_ARG=$weekStart"

/** Agenda del entrenador (E13): la semana en lista por día, con confirmar y cancelar. */
fun NavGraphBuilder.trainerAgendaRoutes(navController: NavHostController) {
    val week = navArgument(AGENDA_WEEK_ARG) {
        type = NavType.StringType
        nullable = true
        defaultValue = null
    }
    composable(TRAINER_AGENDA_ROUTE, arguments = listOf(week)) { entry ->
        val shown by entry.savedStateHandle.getStateFlow<String?>(AGENDA_SHOW_WEEK_KEY, null).collectAsStateWithLifecycle()
        AgendaScreen(
            onBack = { navController.popBackStack() },
            requestedWeek = weekStartOfDay(shown),
            onWeekShown = { entry.savedStateHandle[AGENDA_SHOW_WEEK_KEY] = null },
        )
    }
}
