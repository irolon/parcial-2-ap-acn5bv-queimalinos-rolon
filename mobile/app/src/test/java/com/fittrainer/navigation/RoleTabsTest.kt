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
}
