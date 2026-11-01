package com.fittrainer.navigation

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fittrainer.ui.challenges.trainer.detail.ChallengeDetailScreen
import com.fittrainer.ui.challenges.trainer.list.ChallengesScreen

/** Desde Más (heredan la pestaña Más). */
const val TRAINER_CHALLENGES_ROUTE = "trainer/challenges"
const val TRAINER_CHALLENGE_ROUTE = "trainer/challenges/{challengeId}"
fun trainerChallengeRoute(challengeId: String) = "trainer/challenges/$challengeId"

/** Desafíos del entrenador (E14): la lista y el detalle, desde donde se asignan a varios alumnos. */
fun NavGraphBuilder.trainerChallengeRoutes(navController: NavHostController) {
    composable(TRAINER_CHALLENGES_ROUTE) {
        ChallengesScreen(
            onBack = { navController.popBackStack() },
            onOpen = { navController.navigate(trainerChallengeRoute(it)) { launchSingleTop = true } },
        )
    }
    composable(TRAINER_CHALLENGE_ROUTE) { ChallengeDetailScreen(onBack = { navController.popBackStack() }) }
}
