package com.fittrainer.ui.workout.service

import java.time.Instant
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** Pantalla y service se reparten cada fin de descanso (por endsAt): el que lo reclama primero avisa, el otro no. */
class RestEndClaimTest {
    private val endsAt = Instant.parse("2026-10-17T12:00:00Z")

    @Before @After fun limpiar() {
        WorkoutScreenVisibility.notifiedRestEnd.set(null)
    }

    @Test fun siLaPantallaReclamaElServiceNoPublica() {
        assertTrue(WorkoutScreenVisibility.claimRestEnd(endsAt))
        assertFalse(shouldPostRestDone(visible = false, claimed = WorkoutScreenVisibility.claimRestEnd(endsAt)))
    }

    @Test fun siElServiceReclamaPrimeroLaPantallaNoAvisa() {
        assertTrue(shouldPostRestDone(visible = false, claimed = WorkoutScreenVisibility.claimRestEnd(endsAt)))
        assertFalse(WorkoutScreenVisibility.claimRestEnd(endsAt))
    }

    @Test fun unDescansoNuevoSePuedeReclamarDeNuevo() {
        assertTrue(WorkoutScreenVisibility.claimRestEnd(endsAt))
        assertTrue(WorkoutScreenVisibility.claimRestEnd(endsAt.plusSeconds(90)))
    }

    @Test fun alCancelarElAvisoSeLiberaElReclamo() {
        assertTrue(WorkoutScreenVisibility.claimRestEnd(endsAt))
        WorkoutScreenVisibility.notifiedRestEnd.set(null)
        assertTrue(WorkoutScreenVisibility.claimRestEnd(endsAt))
    }

    @Test fun conLaPantallaVisibleNoSePublicaAunqueSeaElPrimero() {
        assertFalse(shouldPostRestDone(visible = true, claimed = true))
    }

    @Test fun sinReclamoNoSePublica() {
        assertFalse(shouldPostRestDone(visible = false, claimed = false))
        assertTrue(shouldPostRestDone(visible = false, claimed = true))
    }
}
