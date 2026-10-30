package com.fittrainer.ui.workout

import com.fittrainer.data.workout.Rest
import com.fittrainer.data.workout.WorkoutSet
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WorkoutFeedbackTest {

    private val endsAt = Instant.parse("2026-10-30T12:00:00Z")

    @Test fun serieGuardadaConPesoYReps() {
        val set = WorkoutSet("s-1", 0, "ex-0", null, "re-0", 2, 23.5, 10, endsAt)
        assertEquals("Serie 2 guardada · 23,5 kg × 10", setSavedText(set))
    }

    @Test fun finDelDescansoConLaSerieQueSigue() {
        assertEquals("Descanso terminado · Serie 3 de 4", restDoneInAppText(3, 4))
    }

    @Test fun descansoQueLlegoACeroAvisa() {
        assertTrue(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt, notifiedEnd = null))
        assertTrue(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt.plusSeconds(2), notifiedEnd = null))
    }

    @Test fun cerrarloUnInstanteAntesDeEndsAtCuentaComoFin() {
        assertTrue(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt.minusMillis(500), notifiedEnd = null))
    }

    @Test fun saltarElDescansoNoAvisa() {
        assertFalse(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt.minusSeconds(20), notifiedEnd = null))
    }

    @Test fun descansoEnPausaNoAvisa() {
        assertFalse(shouldAlertRestEnd(Rest(null, 60, 30_000), endsAt, notifiedEnd = null))
    }

    @Test fun siYaLoAvisoLaNotificacionNoSeRepiteAlVolver() {
        // Celular bloqueado: sonó la notificación; al desbloquear enseguida la pantalla no vuelve a sonar.
        assertFalse(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt.plusSeconds(1), notifiedEnd = endsAt))
    }

    @Test fun volverMuchoDespuesDelFinNoAvisa() {
        // Sin notificación (permiso apagado) y la app vuelve al frente mucho después: ya no es noticia.
        assertFalse(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt.plusSeconds(30), notifiedEnd = null))
    }

    @Test fun laNotificacionDeOtroDescansoNoSilenciaEste() {
        assertTrue(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt, notifiedEnd = endsAt.minusSeconds(120)))
    }
}
