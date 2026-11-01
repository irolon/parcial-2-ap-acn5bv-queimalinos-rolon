package com.fittrainer.navigation

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fittrainer.ui.templates.trainer.detail.TemplateDetailScreen
import com.fittrainer.ui.templates.trainer.list.TemplatesScreen

/** Desde Más (heredan la pestaña Más). */
const val TRAINER_TEMPLATES_ROUTE = "trainer/templates"
const val TRAINER_TEMPLATE_ROUTE = "trainer/templates/{templateId}"
fun trainerTemplateRoute(templateId: String) = "trainer/templates/$templateId"

/** Desde la ficha de un alumno (heredan la pestaña Alumnos). */
const val TRAINER_STUDENT_TEMPLATES_ROUTE = "trainer/students/{studentId}/templates"
fun trainerStudentTemplatesRoute(studentId: String) = "trainer/students/$studentId/templates"
const val TRAINER_STUDENT_TEMPLATE_ROUTE = "trainer/students/{studentId}/templates/{templateId}"
fun trainerStudentTemplateRoute(studentId: String, templateId: String) = "trainer/students/$studentId/templates/$templateId"

/**
 * Plantillas del entrenador (E9). Al asignar se abre el editor de la rutina nueva. Desde la ficha, las
 * pantallas de plantillas salen del back stack, así "atrás" desde el editor vuelve a la ficha.
 */
fun NavGraphBuilder.trainerTemplateRoutes(navController: NavHostController) {
    composable(TRAINER_TEMPLATES_ROUTE) {
        TemplatesScreen(onBack = { navController.popBackStack() }, onOpen = { navController.navigate(trainerTemplateRoute(it)) { launchSingleTop = true } })
    }
    composable(TRAINER_TEMPLATE_ROUTE) {
        TemplateDetailScreen(
            onBack = { navController.popBackStack() },
            onAssigned = { navController.navigate(trainerRoutineRoute(it)) { launchSingleTop = true } },
        )
    }
    composable(TRAINER_STUDENT_TEMPLATES_ROUTE) { entry ->
        val studentId = entry.arguments?.getString("studentId").orEmpty()
        TemplatesScreen(
            onBack = { navController.popBackStack() },
            onOpen = { navController.navigate(trainerStudentTemplateRoute(studentId, it)) { launchSingleTop = true } },
        )
    }
    composable(TRAINER_STUDENT_TEMPLATE_ROUTE) {
        TemplateDetailScreen(
            onBack = { navController.popBackStack() },
            onAssigned = { routineId ->
                navController.navigate(trainerRoutineRoute(routineId)) {
                    popUpTo(TRAINER_STUDENT_TEMPLATES_ROUTE) { inclusive = true }
                    launchSingleTop = true
                }
            },
        )
    }
}
