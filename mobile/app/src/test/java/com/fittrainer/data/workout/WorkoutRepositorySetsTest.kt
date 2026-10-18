package com.fittrainer.data.workout

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import com.fittrainer.testing.fakes.workout.T0
import java.time.Instant
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WorkoutRepositorySetsTest {

    private val dao = FakeWorkoutDao()
    private val clock = MutableClock(T0.toEpochMilli())
    private var next = 0
    private val repo = WorkoutRepository(dao, clock) { "id-${next++}" }

    private fun ex(i: Int, rest: Int? = 60) =
        RoutineExercise("re-$i", "ex-$i", "E$i", "chest", null, null, 2, 8, rest, 40.0, null, null)

    private suspend fun active() = repo.observeActive("u1").first()!!

    private suspend fun startWith(vararg exercises: RoutineExercise) =
        repo.start("u1", Routine("rt-1", "Push", null, emptySet(), Instant.EPOCH, exercises.toList()))

    @Test fun `confirmar guarda la serie con hora real, avanza y arranca el descanso`() = runTest {
        startWith(ex(0), ex(1))
        clock.millis += 5_000

        assertEquals(SaveOutcome.Advanced, repo.saveSet("u1", 0, 1, Load(42.5, 9)))

        val w = active()
        val set = w.sets.single()
        assertEquals(Load(42.5, 9), Load(set.kg, set.reps))
        assertEquals(T0.plusSeconds(5), set.executedAt)
        assertEquals("re-0", set.routineExerciseId)
        assertEquals(Cursor(0, 2), w.cursor)
        assertEquals(T0.plusSeconds(65), w.rest?.endsAt)
    }

    @Test fun `confirmar dos veces la misma serie no la duplica`() = runTest {
        startWith(ex(0))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))

        assertEquals(SaveOutcome.Corrected, repo.saveSet("u1", 0, 1, Load(40.0, 8)))

        val w = active()
        assertEquals(1, w.sets.size)
        assertEquals(Cursor(0, 2), w.cursor)
    }

    @Test fun `corregir conserva id y hora y no toca cursor ni descanso`() = runTest {
        startWith(ex(0), ex(1))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))
        val before = active()
        clock.millis += 30_000

        repo.saveSet("u1", 0, 1, Load(37.5, 10))

        val after = active()
        assertEquals(before.sets.single().id, after.sets.single().id)
        assertEquals(before.sets.single().executedAt, after.sets.single().executedAt)
        assertEquals(37.5, after.sets.single().kg, 0.0)
        assertEquals(before.cursor, after.cursor)
        assertEquals(before.rest, after.rest)
    }

    @Test fun `corregir en un ejercicio completo lleva el cursor a la primera pendiente`() = runTest {
        startWith(ex(0), ex(1))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))
        repo.saveSet("u1", 0, 2, Load(40.0, 8))
        repo.moveTo("u1", 0)
        assertEquals(Cursor(0, 2), active().cursor)

        assertEquals(SaveOutcome.Corrected, repo.saveSet("u1", 0, 2, Load(45.0, 6)))

        assertEquals(Cursor(1, 1), active().cursor)
        assertEquals(45.0, active().sets.first { it.setNumber == 2 }.kg, 0.0)
    }

    @Test fun `la ultima serie devuelve AllDone y no arranca descanso`() = runTest {
        startWith(ex(0))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))

        assertEquals(SaveOutcome.AllDone, repo.saveSet("u1", 0, 2, Load(40.0, 8)))
        assertNull(active().rest)
    }

    @Test fun `un ejercicio sin descanso pasa directo a la serie`() = runTest {
        startWith(ex(0, rest = 0))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))

        assertNull(active().rest)
    }

    @Test fun `ir a un ejercicio pone el cursor en su primera serie pendiente`() = runTest {
        startWith(ex(0), ex(1))
        repo.moveTo("u1", 1)
        assertEquals(Cursor(1, 1), active().cursor)
    }

    @Test fun `mas 15, pausa y saltar cambian el descanso`() = runTest {
        startWith(ex(0))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))

        repo.adjustRest("u1", 15)
        assertEquals(T0.plusSeconds(75), active().rest?.endsAt)
        repo.toggleRestPause("u1")
        assertEquals(75_000L, active().rest?.pausedRemainingMs)
        repo.skipRest("u1")
        assertNull(active().rest)
    }

    @Test fun `endRestIfOver solo termina el descanso vencido`() = runTest {
        startWith(ex(0))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))

        repo.endRestIfOver("u1")
        assertEquals(T0.plusSeconds(60), active().rest?.endsAt)
        clock.millis += 60_000
        repo.endRestIfOver("u1")
        assertNull(active().rest)
    }

    @Test fun `ajustar un descanso ya terminado no lo revive`() = runTest {
        startWith(ex(0))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))
        clock.millis += 60_000
        repo.endRestIfOver("u1")

        repo.adjustRest("u1", 15)

        assertNull(active().rest)
    }

    @Test fun `la ultima vez sale de sesiones terminadas`() = runTest {
        startWith(ex(0))
        repo.saveSet("u1", 0, 1, Load(55.0, 6))
        repo.finish("u1")

        assertEquals(55.0, repo.lastSetFor("u1", "ex-0")?.kg)
        assertNull(repo.lastSetFor("u2", "ex-0"))
    }
}
