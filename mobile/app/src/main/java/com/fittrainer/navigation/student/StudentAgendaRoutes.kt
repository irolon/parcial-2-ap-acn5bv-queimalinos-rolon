package com.fittrainer.navigation.student

import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fittrainer.navigation.STUDENT_PROFILE_ROUTE
import com.fittrainer.ui.agenda.student.mine.APPOINTMENT_REQUESTED_KEY
import com.fittrainer.ui.agenda.student.mine.MyAppointmentsScreen
import com.fittrainer.ui.agenda.student.request.RequestAppointmentScreen

/** Desde Perfil (heredan la pestaña Perfil) y desde los push y avisos de turnos. */
const val STUDENT_APPOINTMENTS_ROUTE = "$STUDENT_PROFILE_ROUTE/appointments"
const val STUDENT_REQUEST_APPOINTMENT_ROUTE = "$STUDENT_PROFILE_ROUTE/appointments/request"

/** Turnos del alumno (tarjeta 16): «Mis turnos» y, encima, «Pedir turno». */
fun NavGraphBuilder.studentAgendaRoutes(navController: NavHostController) {
    composable(STUDENT_APPOINTMENTS_ROUTE) { entry ->
        // El handle de la entrada no es el del ViewModel (hallazgo de Codex): el resultado se lee acá y se le pasa.
        val requested by entry.savedStateHandle.getStateFlow(APPOINTMENT_REQUESTED_KEY, false).collectAsStateWithLifecycle()
        MyAppointmentsScreen(
            onBack = { navController.popBackStack() },
            // Un doble toque no apila dos veces la misma pantalla.
            onRequest = { navController.navigate(STUDENT_REQUEST_APPOINTMENT_ROUTE) { launchSingleTop = true } },
            requestedResult = requested,
            onResultConsumed = { entry.savedStateHandle[APPOINTMENT_REQUESTED_KEY] = false },
        )
    }
    composable(STUDENT_REQUEST_APPOINTMENT_ROUTE) { entry ->
        RequestAppointmentScreen(
            onBack = { navController.popBackStack() },
            onRequested = {
                // Solo si sigue arriba: un segundo disparo no saca también «Mis turnos». El aviso lo muestra la de abajo.
                if (navController.currentBackStackEntry?.id == entry.id) {
                    navController.previousBackStackEntry?.savedStateHandle?.set(APPOINTMENT_REQUESTED_KEY, true)
                    navController.popBackStack()
                }
            },
        )
    }
}
