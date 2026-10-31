package com.fittrainer.ui.workout

import com.fittrainer.data.workout.Load
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

    @Test fun finDelDescansoDiceLoMismoQueLaNotificacion() {
        assertEquals("Descanso terminado · Próxima: 70 kg × 8", restDoneInAppText(Load(70.0, 8), exerciseName = null))
    }

    @Test fun siCambioDeEjercicioElAvisoDiceCualEs() {
        assertEquals(
            "Descanso terminado · Remo con barra · Próxima: 60 kg × 10",
            restDoneInAppText(Load(60.0, 10), exerciseName = "Remo con barra"),
        )
    }

    @Test fun conLaPantallaEnPausaPeroVisibleAvisaSoloElService() {
        // Cortina bajada o pantalla dividida: el service es el único que avisa, así no suenan los dos.
        assertFalse(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt, notifiedEnd = null, screenVisible = false))
    }

    @Test fun laSerieGuardadaSaleSoloSiNoArrancaDescanso() {
        assertTrue(shouldFlashSetSaved(before = 2, after = 3, isResting = false))
        assertFalse(shouldFlashSetSaved(before = 2, after = 3, isResting = true))
    }

    @Test fun laPrimeraEmisionOUnaCorreccionNoSonSerieGuardada() {
        assertFalse(shouldFlashSetSaved(before = null, after = 3, isResting = false))
        assertFalse(shouldFlashSetSaved(before = 3, after = 3, isResting = false))
        assertFalse(shouldFlashSetSaved(before = 3, after = 2, isResting = false))
    }

    @Test fun descansoQueLlegoACeroAvisa() {
        assertTrue(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt, notifiedEnd = null, screenVisible = true))
        assertTrue(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt.plusSeconds(2), notifiedEnd = null, screenVisible = true))
    }

    @Test fun cerrarloUnInstanteAntesDeEndsAtCuentaComoFin() {
        assertTrue(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt.minusMillis(500), notifiedEnd = null, screenVisible = true))
    }

    @Test fun saltarElDescansoNoAvisa() {
        assertFalse(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt.minusSeconds(20), notifiedEnd = null, screenVisible = true))
    }

    @Test fun descansoEnPausaNoAvisa() {
        assertFalse(shouldAlertRestEnd(Rest(null, 60, 30_000), endsAt, notifiedEnd = null, screenVisible = true))
    }

    @Test fun siYaLoAvisoLaNotificacionNoSeRepiteAlVolver() {
        // Celular bloqueado: sonó la notificación; al desbloquear enseguida la pantalla no vuelve a sonar.
        assertFalse(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt.plusSeconds(1), notifiedEnd = endsAt, screenVisible = true))
    }

    @Test fun volverMuchoDespuesDelFinNoAvisa() {
        // Sin notificación (permiso apagado) y la app vuelve al frente mucho después: ya no es noticia.
        assertFalse(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt.plusSeconds(30), notifiedEnd = null, screenVisible = true))
    }

    @Test fun laNotificacionDeOtroDescansoNoSilenciaEste() {
        assertTrue(shouldAlertRestEnd(Rest(endsAt, 60, null), endsAt, notifiedEnd = endsAt.minusSeconds(120), screenVisible = true))
    }
}
