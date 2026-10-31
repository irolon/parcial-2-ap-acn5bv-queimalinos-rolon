package com.fittrainer.ui.routines.detail

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.testing.fakes.workout.workout
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

class StartActionTest {

    private fun exercise(sets: Int? = 4, reps: Int? = 10, kg: Double? = 60.0, rest: Int? = 90, muscle: String? = "chest") =
        RoutineExercise("re-1", "ex-1", "Press", muscle, null, null, sets, reps, rest, kg, null, null)

    private fun routine(id: String = "rt-1", exercises: List<RoutineExercise> = listOf(exercise())) =
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

    @Test fun `subtitulo completo y sin separadores colgando`() {
        assertEquals("4×10 · 60 kg · 90 s · Pecho", detailSubtitle(exercise()))
        assertEquals("4 series · Pecho", detailSubtitle(exercise(reps = null, kg = null, rest = null)))
        assertEquals("", detailSubtitle(exercise(sets = null, reps = null, kg = null, rest = null, muscle = null)))
    }
}
