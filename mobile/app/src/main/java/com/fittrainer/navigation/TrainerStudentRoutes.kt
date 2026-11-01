package com.fittrainer.navigation

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fittrainer.ui.invitations.InviteScreen
import com.fittrainer.ui.students.detail.StudentDetailScreen
import com.fittrainer.ui.students.edit.EditStudentScreen
import com.fittrainer.ui.students.sessions.LatestSessionsSection
import com.fittrainer.ui.students.sessions.StudentSessionsScreen
import com.fittrainer.ui.students.sessions.detail.StudentSessionDetailScreen

/** Pantallas que cuelgan de la pestaña Alumnos del entrenador (E2-E6): invitar, ficha, edición y sesiones. */
fun NavGraphBuilder.trainerStudentRoutes(navController: NavHostController) {
    composable(TRAINER_INVITE_ROUTE) {
        InviteScreen(onBack = { navController.popBackStack() })
    }
    composable(TRAINER_STUDENT_DETAIL_ROUTE) { entry ->
        val id = entry.arguments?.getString("studentId").orEmpty()
        StudentDetailScreen(
            onBack = { navController.popBackStack() },
            onEdit = { navController.navigate(trainerStudentEditRoute(id)) { launchSingleTop = true } },
            onGone = { navController.popBackStack() },
            extraSections = {
                item {
                    LatestSessionsSection(
                        onOpenAll = { navController.navigate(trainerStudentSessionsRoute(id)) { launchSingleTop = true } },
                        onOpenSession = { navController.navigate(trainerStudentSessionRoute(id, it)) { launchSingleTop = true } },
                    )
                }
            },
        )
    }
    composable(TRAINER_STUDENT_SESSIONS_ROUTE) { entry ->
        val id = entry.arguments?.getString("studentId").orEmpty()
        StudentSessionsScreen(
            onBack = { navController.popBackStack() },
            onOpenSession = { navController.navigate(trainerStudentSessionRoute(id, it)) { launchSingleTop = true } },
        )
    }
    composable(TRAINER_STUDENT_SESSION_ROUTE) {
        StudentSessionDetailScreen(onBack = { navController.popBackStack() })
    }
    composable(TRAINER_STUDENT_EDIT_ROUTE) {
        EditStudentScreen(
            onBack = { navController.popBackStack() },
            // El alumno ya no es del entrenador: la ficha tampoco existe, se vuelve directo a la lista.
            onGone = { navController.popBackStack(TRAINER_STUDENTS_ROUTE, inclusive = false) },
        )
    }
}
