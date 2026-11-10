package com.fittrainer.navigation.trainer

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fittrainer.navigation.TRAINER_STUDENTS_ROUTE
import com.fittrainer.ui.routines.trainer.ai.AiRoutineScreen
import com.fittrainer.ui.routines.trainer.create.NewRoutineScreen
import com.fittrainer.ui.routines.trainer.editor.RoutineEditorScreen

const val TRAINER_NEW_ROUTINE_ROUTE = "trainer/students/{studentId}/routines/new"
fun trainerNewRoutineRoute(studentId: String) = "trainer/students/$studentId/routines/new"

const val TRAINER_AI_ROUTINE_ROUTE = "trainer/students/{studentId}/routines/ai"
fun trainerAiRoutineRoute(studentId: String) = "trainer/students/$studentId/routines/ai"
/** El aviso que deja "Guardar y asignar" en la ficha (lo lee TrainerStudentRoutes). */
const val AI_ROUTINE_NOTICE_KEY = "ai_routine_notice"

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
    composable(TRAINER_AI_ROUTINE_ROUTE) { entry ->
        val studentId = entry.arguments?.getString("studentId").orEmpty()
        AiRoutineScreen(
            onBack = { navController.popBackStack() },
            // Solo si sigue arriba: un segundo disparo no saca también la ficha.
            onDone = { notice ->
                if (navController.currentBackStackEntry?.id == entry.id) {
                    navController.previousBackStackEntry?.savedStateHandle?.set(AI_ROUTINE_NOTICE_KEY, notice)
                    navController.popBackStack()
                }
            },
            onManual = {
                navController.navigate(trainerNewRoutineRoute(studentId)) {
                    popUpTo(TRAINER_AI_ROUTINE_ROUTE) { inclusive = true }
                    launchSingleTop = true
                }
            },
            // Si la lista de alumnos no está en la pila, sale de acá en vez de quedarse en una pantalla sin propuesta.
            onGone = { if (!navController.popBackStack(TRAINER_STUDENTS_ROUTE, inclusive = false)) navController.popBackStack() },
        )
    }
}
