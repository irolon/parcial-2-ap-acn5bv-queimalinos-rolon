package com.fittrainer.data.workout

import com.fittrainer.data.db.workout.STATUS_FINISHED
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import com.fittrainer.testing.fakes.workout.T0
import java.time.Instant
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WorkoutRepositoryTest {

    private val dao = FakeWorkoutDao()
    private val clock = MutableClock(T0.toEpochMilli())
    private var next = 0
    private val repo = WorkoutRepository(dao, clock) { "id-${next++}" }

    private fun routineExercise(i: Int) = RoutineExercise(
        "re-$i", "ex-$i", "Ejercicio $i", "chest", null, null, 2, 8, 60, 40.0, null, null,
    )

    private val routine = Routine("rt-1", "Push", null, emptySet(), Instant.EPOCH, listOf(routineExercise(0), routineExercise(1)))

    @Test fun `empezar copia el plan y deja el cursor en la primera serie`() = runTest {
        val id = repo.start("u1", routine)

        val w = repo.observeActive("u1").first()!!
        assertEquals(id, w.id)
        assertEquals(listOf("ex-0", "ex-1"), w.exercises.map { it.exerciseId })
        assertEquals(Cursor(0, 1), w.cursor)
        assertEquals(T0, w.startedAt)
    }

    @Test fun `empezar con una sesion abierta devuelve esa y no crea otra`() = runTest {
        val first = repo.start("u1", routine)

        assertEquals(first, repo.start("u1", routine))
        assertEquals(1, dao.state.value.sessions.size)
    }

    @Test fun `otro alumno no ve la sesion`() = runTest {
        repo.start("u1", routine)

        assertNull(repo.observeActive("u2").first())
    }

    @Test fun `terminar marca la sesion y devuelve el resumen`() = runTest {
        repo.start("u1", routine)
        repo.saveSet("u1", 0, 1, Load(40.0, 8))
        clock.millis += 52 * 60_000L

        val summary = repo.finish("u1")

        assertEquals(WorkoutSummary(1, 52, "id-0"), summary)
        assertNull(repo.observeActive("u1").first())
        assertEquals(STATUS_FINISHED, dao.state.value.sessions.values.single().status)
    }

    @Test fun `terminar sin series descarta la sesion`() = runTest {
        repo.start("u1", routine)

        assertNull(repo.finish("u1"))
        assertTrue(dao.state.value.sessions.isEmpty())
    }

    @Test fun `descartar borra la sesion con su plan y sus series`() = runTest {
        repo.start("u1", routine)
        repo.saveSet("u1", 0, 1, Load(40.0, 8))

        repo.discard("u1")

        assertEquals(FakeWorkoutDao.State(), dao.state.value)
    }

    @Test fun `reemplazar cambia la copia del plan y conserva series reps y descanso`() = runTest {
        repo.start("u1", routine)
        val bench = LibraryExercise("lib-9", "Press con mancuernas", "chest", "dumbbell", "Bajá lento", "https://v")

        assertTrue(repo.replaceExercise("u1", 0, bench))

        val e = repo.observeActive("u1").first()!!.exercises.first()
        assertEquals("lib-9", e.exerciseId)
        assertEquals("ex-0", e.originalExerciseId)
        assertEquals("Press con mancuernas", e.name)
        assertEquals("Bajá lento", e.description)
        assertEquals(2, e.sets)
        assertEquals(60, e.restSeconds)
    }

    @Test fun `reemplazar dos veces conserva el original y volver lo limpia`() = runTest {
        repo.start("u1", routine)
        repo.replaceExercise("u1", 0, LibraryExercise("lib-1", "A", "chest", null, null, null))
        repo.replaceExercise("u1", 0, LibraryExercise("lib-2", "B", "chest", null, null, null))
        assertEquals("ex-0", repo.observeActive("u1").first()!!.exercises.first().originalExerciseId)

        repo.replaceExercise("u1", 0, LibraryExercise("ex-0", "Ejercicio 0", "chest", null, null, null))

        assertNull(repo.observeActive("u1").first()!!.exercises.first().originalExerciseId)
    }

    @Test fun `no se reemplaza un ejercicio con series hechas`() = runTest {
        repo.start("u1", routine)
        repo.saveSet("u1", 0, 1, Load(40.0, 8))

        assertFalse(repo.replaceExercise("u1", 0, LibraryExercise("lib-1", "A", "chest", null, null, null)))
    }
}
