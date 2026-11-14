package com.fittrainer.navigation

import com.fittrainer.navigation.student.STUDENT_APPOINTMENTS_ROUTE
import com.fittrainer.navigation.student.STUDENT_REQUEST_APPOINTMENT_ROUTE
import com.fittrainer.navigation.trainer.TRAINER_AGENDA_ROUTE
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RoleTabsTest {
    @Test fun progresoQuedaMarcadaEnElDetalleDeUnaSesion() {
        assertTrue(isTabSelected(STUDENT_PROGRESS_ROUTE, historyDetailRoute("a")))
        assertTrue(isTabSelected(STUDENT_PROGRESS_ROUTE, HISTORY_DETAIL_ROUTE))
        assertTrue(isTabSelected(STUDENT_TODAY_ROUTE, STUDENT_TODAY_ROUTE))
    }

    @Test fun losLogrosDejanMarcadaProgreso() {
        assertTrue(isTabSelected(STUDENT_PROGRESS_ROUTE, STUDENT_ACHIEVEMENTS_ROUTE))
        assertFalse(isTabSelected(STUDENT_ROUTINES_ROUTE, STUDENT_ACHIEVEMENTS_ROUTE))
    }

    @Test fun lasOtrasPestanasNoSeMarcan() {
        assertFalse(isTabSelected(STUDENT_TODAY_ROUTE, historyDetailRoute("a")))
        assertFalse(isTabSelected(STUDENT_PROGRESS_ROUTE, STUDENT_TODAY_ROUTE))
        assertFalse(isTabSelected(STUDENT_PROGRESS_ROUTE, null))
    }

    @Test fun misRutinasQuedaMarcadaEnElDetalleYEnLaBiblioteca() {
        assertTrue(isTabSelected(STUDENT_ROUTINES_ROUTE, routineDetailRoute("a")))
        assertTrue(isTabSelected(STUDENT_ROUTINES_ROUTE, ROUTINE_DETAIL_ROUTE))
        assertTrue(isTabSelected(STUDENT_ROUTINES_ROUTE, STUDENT_LIBRARY_ROUTE))
        assertFalse(isTabSelected(STUDENT_PROGRESS_ROUTE, routineDetailRoute("a")))
        assertFalse(isTabSelected(STUDENT_ROUTINES_ROUTE, historyDetailRoute("a")))
    }

    @Test fun alumnosQuedaMarcadaAlInvitar() {
        assertTrue(isTabSelected(TRAINER_STUDENTS_ROUTE, TRAINER_INVITE_ROUTE))
        assertFalse(isTabSelected("trainer/home", TRAINER_INVITE_ROUTE))
    }

    @Test fun masQuedaMarcadaEnLaAgenda() {
        assertTrue(isTabSelected(TRAINER_MORE_ROUTE, TRAINER_AGENDA_ROUTE))
        assertFalse(isTabSelected(TRAINER_HOME_ROUTE, TRAINER_AGENDA_ROUTE))
    }

    @Test fun perfilQuedaMarcadaEnLosTurnosDelAlumno() {
        assertTrue(isTabSelected(STUDENT_PROFILE_ROUTE, STUDENT_APPOINTMENTS_ROUTE))
        assertTrue(isTabSelected(STUDENT_PROFILE_ROUTE, STUDENT_REQUEST_APPOINTMENT_ROUTE))
        assertFalse(isTabSelected(STUDENT_TODAY_ROUTE, STUDENT_APPOINTMENTS_ROUTE))
        assertTrue(StudentTabs.any { it.route == STUDENT_PROFILE_ROUTE && it.isAccountMenu })
    }

    @Test fun conLaSesionActivaNingunaPestanaQuedaMarcada() {
        assertTrue(StudentTabs.none { isTabSelected(it.route, WORKOUT_ROUTE) })
    }
}
