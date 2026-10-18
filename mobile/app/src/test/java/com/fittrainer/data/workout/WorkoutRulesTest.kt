package com.fittrainer.data.workout

import com.fittrainer.testing.fakes.workout.T0
import com.fittrainer.testing.fakes.workout.doneSet
import com.fittrainer.testing.fakes.workout.exercise
import com.fittrainer.testing.fakes.workout.workout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WorkoutRulesTest {

    @Test fun `los valores que faltan en la rutina toman los de por defecto`() {
        val e = exercise(0, sets = null, reps = null, restSeconds = null)
        assertEquals(3, e.totalSets)
        assertEquals(10, e.targetReps)
        assertEquals(90, e.restTotal)
    }

    @Test fun `despues de una serie sigue la proxima del mismo ejercicio`() {
        assertEquals(Cursor(0, 2), workout().nextAfter(Cursor(0, 1)))
    }

    @Test fun `al completar un ejercicio pasa al primero con series pendientes`() {
        val w = workout(sets = listOf(doneSet(0, 1)), cursor = Cursor(0, 2))
        assertEquals(Cursor(1, 1), w.nextAfter(Cursor(0, 2)))
    }

    @Test fun `si salto un ejercicio vuelve al que quedo pendiente`() {
        val w = workout(
            exercises = listOf(exercise(0), exercise(1), exercise(2)),
            sets = listOf(doneSet(1, 1), doneSet(1, 2), doneSet(2, 1)),
            cursor = Cursor(2, 2),
        )
        assertEquals(Cursor(0, 1), w.nextAfter(Cursor(2, 2)))
    }

    @Test fun `sin series pendientes no hay proxima y la ultima pendiente se reconoce`() {
        val w = workout(sets = listOf(doneSet(0, 1), doneSet(0, 2), doneSet(1, 1)), cursor = Cursor(1, 2))
        assertTrue(w.isLastPending(Cursor(1, 2)))
        assertNull(w.nextAfter(Cursor(1, 2)))
        assertFalse(workout().isLastPending(Cursor(0, 1)))
    }

    @Test fun `la primera serie precarga lo de la ultima vez y si no hay, el plan del PT`() {
        val last = doneSet(0, 3, kg = 50.0, reps = 6)
        assertEquals(Load(50.0, 6), workout().preload(Cursor(0, 1), last))
        assertEquals(Load(40.0, 8), workout().preload(Cursor(0, 1), null))
    }

    @Test fun `sin peso sugerido ni historial arranca en 0 kg con las reps del plan`() {
        val w = workout(exercises = listOf(exercise(0, suggestedKg = null)))
        assertEquals(Load(0.0, 8), w.preload(Cursor(0, 1), null))
    }

    @Test fun `la segunda serie precarga lo que confirmo en la anterior de hoy`() {
        val w = workout(sets = listOf(doneSet(0, 1, kg = 37.5, reps = 10)), cursor = Cursor(0, 2))
        assertEquals(Load(37.5, 10), w.preload(Cursor(0, 2), doneSet(0, 1, kg = 99.0)))
    }

    @Test fun `una serie ya hecha precarga lo registrado para corregirla`() {
        val w = workout(sets = listOf(doneSet(0, 1, kg = 45.0, reps = 7)), cursor = Cursor(0, 2))
        assertEquals(Load(45.0, 7), w.preload(Cursor(0, 1), null))
    }

    @Test fun `solo se reemplaza un ejercicio sin series hechas`() {
        val w = workout(sets = listOf(doneSet(0, 1)))
        assertFalse(w.canReplace(0))
        assertTrue(w.canReplace(1))
    }

    @Test fun `el resumen cuenta series y minutos`() {
        val w = workout(sets = listOf(doneSet(0, 1), doneSet(0, 2)))
        assertEquals(WorkoutSummary(2, 52), w.summary(T0.plusSeconds(52 * 60 + 30)))
        assertEquals(2, w.pendingSets())
    }

    @Test fun `la ultima serie hecha es la de executedAt mas reciente`() {
        val w = workout(sets = listOf(doneSet(1, 1, at = T0.plusSeconds(90)), doneSet(0, 2, at = T0.plusSeconds(10))))
        assertEquals("set-1-1", w.lastDoneSet()?.id)
    }
}
