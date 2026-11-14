package com.fittrainer.navigation.account

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fittrainer.navigation.STUDENT_PROFILE_ROUTE
import com.fittrainer.navigation.TRAINER_MORE_ROUTE
import com.fittrainer.ui.account.PASSWORD_CHANGED_KEY
import com.fittrainer.ui.account.edit.EditProfileScreen
import com.fittrainer.ui.account.password.ChangePasswordScreen

/** Editar perfil y Cambiar contraseña cuelgan de Perfil (alumno) o de Más (entrenador): así queda marcada esa pestaña. */
fun accountEditRoute(isStudent: Boolean) = "${accountBase(isStudent)}/edit"
fun accountPasswordRoute(isStudent: Boolean) = "${accountBase(isStudent)}/password"

private fun accountBase(isStudent: Boolean) = if (isStudent) STUDENT_PROFILE_ROUTE else TRAINER_MORE_ROUTE

fun NavGraphBuilder.accountRoutes(navController: NavHostController) {
    listOf(true, false).forEach { isStudent ->
        composable(accountEditRoute(isStudent)) {
            EditProfileScreen(onBack = { navController.popBackStack() })
        }
        composable(accountPasswordRoute(isStudent)) {
            ChangePasswordScreen(
                onBack = { navController.popBackStack() },
                onDone = {
                    // Perfil / Más lo lee de su SavedStateHandle y muestra "Contraseña actualizada".
                    navController.previousBackStackEntry?.savedStateHandle?.set(PASSWORD_CHANGED_KEY, true)
                    navController.popBackStack()
                },
            )
        }
    }
}
