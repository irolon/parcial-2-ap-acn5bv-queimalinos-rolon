package com.fittrainer.navigation

import com.fittrainer.ui.notifications.launch.NavTarget
import com.fittrainer.ui.notifications.launch.PendingNav
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationNavStepsTest {
    private val progress = NavStep.Tab(STUDENT_PROGRESS_ROUTE)

    @Test fun pushDeComentarioPasaPorProgresoYApilaElDetalle() {
        val steps = navSteps(PendingNav(NavTarget.HistoryDetail("s1"), fromList = false), STUDENT_TODAY_ROUTE)
        assertEquals(listOf(progress, NavStep.Push(historyDetailRoute("s1"))), steps)
    }

    @Test fun desdeLaListaElDetalleSeApilaSobreLaLista() {
        val steps = navSteps(PendingNav(NavTarget.HistoryDetail("s1"), fromList = true), NOTIFICATIONS_ROUTE)
        assertEquals(listOf(NavStep.Push(historyDetailRoute("s1"))), steps)
    }

    @Test fun recordYaEnProgresoNoNavegaYLoAplicaLaPantallaVisible() {
        assertEquals(emptyList<NavStep>(), navSteps(PendingNav(NavTarget.ProgressCharts("e1"), false), STUDENT_PROGRESS_ROUTE))
        assertEquals(emptyList<NavStep>(), navSteps(PendingNav(NavTarget.ProgressHistory, false), STUDENT_PROGRESS_ROUTE))
    }

    @Test fun recordDesdeOtraPantallaVaAProgreso() {
        assertEquals(listOf(progress), navSteps(PendingNav(NavTarget.ProgressCharts("e1"), false), STUDENT_TODAY_ROUTE))
        // Desde un detalle (encima de Progreso) se vuelve a la raíz: la instancia nueva consume el pedido.
        assertEquals(listOf(progress), navSteps(PendingNav(NavTarget.ProgressHistory, false), HISTORY_DETAIL_ROUTE))
    }

    @Test fun avisosVaALaListaSobreHoySalvoQueYaEsteAhi() {
        assertEquals(
            listOf(NavStep.Tab(STUDENT_TODAY_ROUTE), NavStep.Push(NOTIFICATIONS_ROUTE)),
            navSteps(PendingNav(NavTarget.Notifications, false), STUDENT_PROGRESS_ROUTE),
        )
        assertEquals(emptyList<NavStep>(), navSteps(PendingNav(NavTarget.Notifications, true), NOTIFICATIONS_ROUTE))
    }

    /** Revisión de Pablo: el push de récord llega en el resumen de la sesión; el tap espera a que salga. */
    @Test fun duranteLaSesionActivaElDestinoEspera() {
        assertTrue(holdsNavigation(WORKOUT_ROUTE))
        assertFalse(holdsNavigation(STUDENT_TODAY_ROUTE))
        assertFalse(holdsNavigation(ROUTINE_DETAIL_ROUTE))
        assertFalse(holdsNavigation(null))
    }
}
