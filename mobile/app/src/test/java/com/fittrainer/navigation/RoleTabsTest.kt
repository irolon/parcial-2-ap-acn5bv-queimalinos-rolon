package com.fittrainer.navigation

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RoleTabsTest {
    @Test fun progresoQuedaMarcadaEnElDetalleDeUnaSesion() {
        assertTrue(isTabSelected(STUDENT_PROGRESS_ROUTE, historyDetailRoute("a")))
        assertTrue(isTabSelected(STUDENT_PROGRESS_ROUTE, HISTORY_DETAIL_ROUTE))
        assertTrue(isTabSelected(STUDENT_TODAY_ROUTE, STUDENT_TODAY_ROUTE))
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

    @Test fun conLaSesionActivaNingunaPestanaQuedaMarcada() {
        assertTrue(StudentTabs.none { isTabSelected(it.route, WORKOUT_ROUTE) })
    }
}
