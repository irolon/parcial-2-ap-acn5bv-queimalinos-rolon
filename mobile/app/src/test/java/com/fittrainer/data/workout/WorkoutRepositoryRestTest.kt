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

/** Descanso real por serie y descanso elegido por el alumno (tarjeta descanso ajustable, spec §4.2-4.3). */
class WorkoutRepositoryRestTest {

    private val dao = FakeWorkoutDao()
    private val clock = MutableClock(T0.toEpochMilli())
    private var next = 0
    private val repo = WorkoutRepository(dao, clock) { "id-${next++}" }

    private fun ex(i: Int, rest: Int? = 90, sets: Int = 2) =
        RoutineExercise("re-$i", "ex-$i", "E$i", "chest", null, null, sets, 8, rest, 40.0, null, null)

    private suspend fun active() = repo.observeActive("u1").first()!!
    private fun storedRest(id: String) = dao.state.value.sets.single { it.id == id }.restSeconds
    private fun advance(seconds: Long) { clock.millis += seconds * 1_000 }

    private suspend fun startWith(vararg exercises: RoutineExercise) =
        repo.start("u1", Routine("rt-1", "Push", null, emptySet(), Instant.EPOCH, exercises.toList()))

    /** Confirma la serie del cursor y devuelve su id. */
    private suspend fun confirm(): String {
        val c = active().cursor
        repo.saveSet("u1", c.position, c.setNumber, Load(40.0, 8))
        return active().sets.maxByOrNull { it.executedAt }!!.id
    }

    @Test fun `saltar guarda lo que corrio y cierra el descanso en la misma escritura`() = runTest {
        startWith(ex(0))
        val s1 = confirm()
        advance(40)
        repo.skipRest("u1")
        assertEquals(40, storedRest(s1))
        assertNull(active().rest)
    }

    @Test fun `vencido con la app cerrada cuenta hasta el fin, no hasta que se abrio`() = runTest {
        startWith(ex(0))
        val s1 = confirm()
        advance(300)
        repo.endRestIfOver("u1")
        assertEquals(90, storedRest(s1))
    }

    @Test fun `antes de vencer endRestIfOver no anota nada`() = runTest {
        startWith(ex(0))
        val s1 = confirm()
        advance(30)
        repo.endRestIfOver("u1")
        assertNull(storedRest(s1))
    }

    @Test fun `la pausa cuenta como descanso`() = runTest {
        startWith(ex(0))
        val s1 = confirm()
        advance(20)
        repo.toggleRestPause("u1")
        advance(30)
        repo.skipRest("u1")
        assertEquals(50, storedRest(s1))
    }

    @Test fun `menos 15 hasta 0 cierra el descanso en ese momento`() = runTest {
        startWith(ex(0, rest = 15))
        val s1 = confirm()
        advance(5)
        repo.adjustRest("u1", -15)
        assertEquals(5, storedRest(s1))
        assertNull(active().rest)
    }

    @Test fun `la ultima de un ejercicio registra el descanso de transicion y la ultima de la sesion queda nula`() = runTest {
        startWith(ex(0, sets = 1), ex(1, sets = 1))
        val s1 = confirm()
        advance(25)
        repo.skipRest("u1")
        val s2 = confirm()
        assertEquals(25, storedRest(s1))
        assertNull(storedRest(s2))
    }

    @Test fun `terminar con el descanso corriendo lo registra`() = runTest {
        startWith(ex(0))
        val s1 = confirm()
        advance(10)
        repo.finish("u1")
        assertEquals(10, storedRest(s1))
    }

    @Test fun `serie nueva con un descanso corriendo cierra el anterior`() = runTest {
        startWith(ex(0), ex(1))
        val s1 = confirm()
        advance(12)
        repo.moveTo("u1", 1)
        val s2 = confirm()
        assertEquals(12, storedRest(s1))
        assertNull(storedRest(s2))
    }

    @Test fun `corregir una serie conserva su descanso`() = runTest {
        startWith(ex(0))
        val s1 = confirm()
        advance(60)
        repo.skipRest("u1")
        repo.saveSet("u1", 0, 1, Load(45.0, 6))
        assertEquals(60, storedRest(s1))
        assertEquals(45.0, dao.state.value.sets.single { it.id == s1 }.actualKg, 0.0)
    }

    @Test fun `el descanso elegido va de 15 en 15 entre 0 y 10 minutos`() = runTest {
        startWith(ex(0), ex(1, rest = 600), ex(2, rest = 900))
        repo.adjustPlannedRest("u1", 0, 15)
        assertEquals(105, active().exercise(0).restTotal)
        repeat(8) { repo.adjustPlannedRest("u1", 0, -15) }
        assertEquals(0, active().exercise(0).restTotal)
        repo.adjustPlannedRest("u1", 1, 15)
        assertEquals(600, active().exercise(1).restTotal)
        repo.adjustPlannedRest("u1", 2, -15)
        assertEquals(885, active().exercise(2).restTotal)
        assertEquals(90, active().exercise(0).plannedRest)
    }

    @Test fun `la siguiente serie arranca el timer con el descanso elegido`() = runTest {
        startWith(ex(0))
        repo.adjustPlannedRest("u1", 0, 30)
        confirm()
        assertEquals(120, active().rest?.totalSeconds)
        assertEquals(T0.plusSeconds(120), active().rest?.endsAt)
    }
}
