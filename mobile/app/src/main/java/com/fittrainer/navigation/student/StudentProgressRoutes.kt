package com.fittrainer.navigation.student

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.fittrainer.navigation.STUDENT_PROGRESS_ROUTE
import com.fittrainer.navigation.historyDetailRoute
import com.fittrainer.ui.progress.sections.ProgressChartsScreen
import com.fittrainer.ui.progress.sections.ProgressHistoryScreen

const val STUDENT_PROGRESS_HISTORY_ROUTE = "$STUDENT_PROGRESS_ROUTE/history"
private const val CHARTS_EXERCISE_ARG = "exercise"
const val STUDENT_PROGRESS_CHARTS_ROUTE = "$STUDENT_PROGRESS_ROUTE/charts?$CHARTS_EXERCISE_ARG={$CHARTS_EXERCISE_ARG}"

/** Sin [exerciseId] abre Gráficos como esté; con uno, en Cargas con ese ejercicio (aviso de récord). */
fun progressChartsRoute(exerciseId: String? = null): String =
    if (exerciseId == null) "$STUDENT_PROGRESS_ROUTE/charts" else "$STUDENT_PROGRESS_ROUTE/charts?$CHARTS_EXERCISE_ARG=$exerciseId"

/** Historial y Gráficos del alumno: cuelgan de las tarjetas de Progreso; volver lleva a Progreso. */
fun NavGraphBuilder.studentProgressRoutes(navController: NavHostController) {
    composable(STUDENT_PROGRESS_HISTORY_ROUTE) {
        ProgressHistoryScreen(
            onBack = { navController.popBackStack() },
            onOpen = { navController.navigate(historyDetailRoute(it)) { launchSingleTop = true } },
        )
    }
    val exercise = navArgument(CHARTS_EXERCISE_ARG) {
        type = NavType.StringType
        nullable = true
        defaultValue = null
    }
    composable(STUDENT_PROGRESS_CHARTS_ROUTE, arguments = listOf(exercise)) { entry ->
        ProgressChartsScreen(
            onBack = { navController.popBackStack() },
            exerciseId = entry.arguments?.getString(CHARTS_EXERCISE_ARG),
        )
    }
}
