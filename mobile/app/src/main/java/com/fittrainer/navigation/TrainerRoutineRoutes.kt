package com.fittrainer.navigation

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fittrainer.ui.routines.trainer.create.NewRoutineScreen
import com.fittrainer.ui.routines.trainer.editor.RoutineEditorScreen

const val TRAINER_NEW_ROUTINE_ROUTE = "trainer/students/{studentId}/routines/new"
fun trainerNewRoutineRoute(studentId: String) = "trainer/students/$studentId/routines/new"

const val TRAINER_ROUTINE_ROUTE = "trainer/routines/{routineId}"
fun trainerRoutineRoute(routineId: String) = "trainer/routines/$routineId"

/** Rutinas del alumno para el entrenador (E8): el editor y el asistente "Rutina nueva", desde la ficha. */
fun NavGraphBuilder.trainerRoutineRoutes(navController: NavHostController) {
    composable(TRAINER_ROUTINE_ROUTE) {
        RoutineEditorScreen(onBack = { navController.popBackStack() })
    }
    composable(TRAINER_NEW_ROUTINE_ROUTE) {
        NewRoutineScreen(
            onBack = { navController.popBackStack() },
            // El asistente se reemplaza por el editor: "atrás" desde el editor vuelve a la ficha.
            onCreated = { id ->
                navController.navigate(trainerRoutineRoute(id)) {
                    popUpTo(TRAINER_NEW_ROUTINE_ROUTE) { inclusive = true }
                    launchSingleTop = true
                }
            },
        )
    }
}
