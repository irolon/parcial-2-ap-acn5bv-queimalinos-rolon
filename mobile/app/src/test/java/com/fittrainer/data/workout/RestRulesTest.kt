package com.fittrainer.data.workout

import com.fittrainer.testing.fakes.workout.T0
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RestRulesTest {

    private val running = Rest(endsAt = T0.plusSeconds(90), totalSeconds = 90, pausedRemainingMs = null)

    @Test fun `el fin de un descanso vencido es su endsAt y si no, ahora`() {
        assertEquals(T0.plusSeconds(90), running.endedAt(T0.plusSeconds(400)))
        assertEquals(T0.plusSeconds(40), running.endedAt(T0.plusSeconds(40)))
        val paused = running.togglePause(T0.plusSeconds(10))
        assertEquals(T0.plusSeconds(500), paused.endedAt(T0.plusSeconds(500)))
    }

    @Test fun `el descanso que corre es el elegido por el alumno y el plan no cambia`() {
        val e = WorkoutExercise(0, "re-0", "ex-0", null, "Press", null, null, null, null, 4, 10, 90, 40.0)
        assertEquals(90, e.restTotal)
        assertEquals(120, e.copy(restOverrideSeconds = 120).restTotal)
        assertEquals(90, e.copy(restOverrideSeconds = 120).plannedRest)
        assertEquals(0, e.copy(restOverrideSeconds = 0).restTotal)
        assertEquals(DEFAULT_REST_SECONDS, e.copy(restSeconds = null).plannedRest)
    }

    @Test fun `arranca con los segundos del ejercicio y con 0 no hay descanso`() {
        assertEquals(running, startRest(90, T0))
        assertNull(startRest(0, T0))
    }

    @Test fun `lo que falta sale de la hora real y nunca es negativo`() {
        assertEquals(34_000L, running.remainingMs(T0.plusSeconds(56)))
        assertEquals(0L, running.remainingMs(T0.plusSeconds(200)))
        assertTrue(running.isOver(T0.plusSeconds(90)))
        assertFalse(running.isOver(T0.plusSeconds(89)))
    }

    @Test fun `mas 15 extiende el fin y agranda el total si hace falta`() {
        val r = running.adjust(15, T0.plusSeconds(10))!!
        assertEquals(T0.plusSeconds(105), r.endsAt)
        assertEquals(95, r.totalSeconds)
    }

    @Test fun `menos 15 nunca baja de 0 y llegar a 0 termina el descanso`() {
        assertEquals(T0.plusSeconds(75), running.adjust(-15, T0)!!.endsAt)
        assertNull(running.adjust(-15, T0.plusSeconds(80)))
    }

    @Test fun `pausar congela lo que falta y seguir lo retoma desde ahora`() {
        val paused = running.togglePause(T0.plusSeconds(30))
        assertTrue(paused.isPaused)
        assertEquals(60_000L, paused.remainingMs(T0.plusSeconds(500)))
        val resumed = paused.togglePause(T0.plusSeconds(500))
        assertEquals(T0.plusSeconds(560), resumed.endsAt)
        assertFalse(resumed.isPaused)
    }

    @Test fun `ajustar en pausa cambia lo que falta sin arrancar`() {
        val paused = running.togglePause(T0).adjust(15, T0.plusSeconds(999))!!
        assertEquals(105_000L, paused.pausedRemainingMs)
        assertNull(paused.endsAt)
    }

    @Test fun `el descanso termino solo si el fin anterior ya paso y cambio`() {
        val end = T0.plusSeconds(90)
        assertTrue(restJustEnded(end, null, T0.plusSeconds(90)))
        assertFalse(restJustEnded(end, null, T0.plusSeconds(40)))
        assertFalse(restJustEnded(end, end, T0.plusSeconds(95)))
        assertFalse(restJustEnded(null, end, T0))
    }
}
