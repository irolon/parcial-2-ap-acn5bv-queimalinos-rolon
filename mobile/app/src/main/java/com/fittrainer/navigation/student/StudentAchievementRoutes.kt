package com.fittrainer.navigation.student

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fittrainer.navigation.STUDENT_ACHIEVEMENTS_ROUTE
import com.fittrainer.ui.gamification.AchievementsScreen

/** Logros del alumno (tarjeta 15): cuelga de Progreso; volver lleva a Progreso. */
fun NavGraphBuilder.studentAchievementRoutes(navController: NavHostController) {
    composable(STUDENT_ACHIEVEMENTS_ROUTE) {
        AchievementsScreen(onBack = { navController.popBackStack() })
    }
}
