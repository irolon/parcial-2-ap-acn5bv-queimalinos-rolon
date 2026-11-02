package com.fittrainer.ui.today

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.testing.fakes.workout.workout
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class StartActionTest {

    private val exercise = RoutineExercise("re-1", "ex-1", "Press", "chest", null, null, 4, 10, 90, 60.0, null, null)

    private fun routine(id: String = "rt-1", exercises: List<RoutineExercise> = listOf(exercise)) =
        Routine(id, "Pecho", null, emptySet(), Instant.EPOCH, exercises)

    // workout() de los fixtures es de la rutina "rt-1" y se llama "Push".

    @Test fun `sin sesion abierta se puede empezar`() {
        assertEquals(StartAction.Start, startAction(routine(), active = null))
    }

    @Test fun `con la sesion de esta rutina se continua aunque ya no tenga ejercicios`() {
        assertEquals(StartAction.Continue, startAction(routine(exercises = emptyList()), workout()))
    }

    @Test fun `con la sesion de otra rutina queda bloqueado con su nombre`() {
        assertEquals(StartAction.Blocked("Push"), startAction(routine(id = "rt-2"), workout()))
    }

    @Test fun `una sesion sin rutina tambien bloquea`() {
        assertEquals(StartAction.Blocked("Push"), startAction(routine(), workout().copy(routineId = null)))
    }

    @Test fun `sin ejercicios y sin sesion no se puede empezar`() {
        assertEquals(StartAction.NoExercises, startAction(routine(exercises = emptyList()), active = null))
    }

    @Test fun `el aviso solo aparece cuando no se puede empezar`() {
        assertEquals("Tenés una sesión abierta de Push, terminala primero", startActionHint(StartAction.Blocked("Push")))
        assertEquals("Esta rutina no tiene ejercicios", startActionHint(StartAction.NoExercises))
        assertNull(startActionHint(StartAction.Start))
        assertNull(startActionHint(StartAction.Continue))
    }
}
