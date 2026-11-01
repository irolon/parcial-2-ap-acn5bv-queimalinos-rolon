package com.fittrainer.navigation

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fittrainer.ui.exercises.trainer.form.ExerciseFormScreen
import com.fittrainer.ui.exercises.trainer.library.TrainerLibraryScreen

/** Desde Más (heredan la pestaña Más). */
const val TRAINER_EXERCISES_ROUTE = "trainer/exercises"
const val TRAINER_EXERCISE_NEW_ROUTE = "trainer/exercises/new"
const val TRAINER_EXERCISE_EDIT_ROUTE = "trainer/exercises/{exerciseId}/edit"
fun trainerExerciseEditRoute(exerciseId: String) = "trainer/exercises/$exerciseId/edit"

/** Biblioteca del entrenador (E10): la lista y el formulario de alta / edición de los propios. */
fun NavGraphBuilder.trainerExerciseRoutes(navController: NavHostController) {
    composable(TRAINER_EXERCISES_ROUTE) {
        TrainerLibraryScreen(
            onBack = { navController.popBackStack() },
            onNew = { navController.navigate(TRAINER_EXERCISE_NEW_ROUTE) { launchSingleTop = true } },
            onEdit = { navController.navigate(trainerExerciseEditRoute(it)) { launchSingleTop = true } },
        )
    }
    composable(TRAINER_EXERCISE_NEW_ROUTE) { ExerciseFormScreen(onBack = { navController.popBackStack() }) }
    composable(TRAINER_EXERCISE_EDIT_ROUTE) { ExerciseFormScreen(onBack = { navController.popBackStack() }) }
}
