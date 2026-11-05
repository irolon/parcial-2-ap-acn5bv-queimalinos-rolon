package com.fittrainer.navigation

import com.fittrainer.navigation.student.STUDENT_APPOINTMENTS_ROUTE
import com.fittrainer.navigation.student.STUDENT_REQUEST_APPOINTMENT_ROUTE
import com.fittrainer.ui.notifications.launch.NavTarget
import com.fittrainer.ui.notifications.launch.PendingNav
import org.junit.Assert.assertEquals
import org.junit.Test

/** Tarjeta 16: un push de turno pasa por Perfil; desde la lista, «Mis turnos» se apila sobre la lista. */
class NotificationNavStepsAppointmentTest {
    private val mine = NavStep.Push(STUDENT_APPOINTMENTS_ROUTE)

    @Test fun elPushAbrePerfilYEncimaMisTurnos() {
        val steps = navSteps(PendingNav(NavTarget.StudentAppointments, fromList = false), STUDENT_TODAY_ROUTE)
        assertEquals(listOf(NavStep.Tab(STUDENT_PROFILE_ROUTE), mine), steps)
    }

    @Test fun desdeLaListaSeApilaSobreLaLista() {
        assertEquals(listOf(mine), navSteps(PendingNav(NavTarget.StudentAppointments, fromList = true), NOTIFICATIONS_ROUTE))
    }

    @Test fun yaAbiertaSeQuedaYDesdePedirTurnoVuelveAPerfil() {
        assertEquals(emptyList<NavStep>(), navSteps(PendingNav(NavTarget.StudentAppointments, false), STUDENT_APPOINTMENTS_ROUTE))
        assertEquals(
            listOf(NavStep.Tab(STUDENT_PROFILE_ROUTE), mine),
            navSteps(PendingNav(NavTarget.StudentAppointments, false), STUDENT_REQUEST_APPOINTMENT_ROUTE),
        )
    }
}
