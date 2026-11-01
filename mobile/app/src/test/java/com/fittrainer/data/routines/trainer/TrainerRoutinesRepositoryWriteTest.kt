package com.fittrainer.data.routines.trainer

import com.fittrainer.data.api.routines.CreateRoutineRequest
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.routines.exerciseDto
import com.fittrainer.testing.fakes.routines.routineDto
import java.io.IOException
import java.time.Clock
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainerRoutinesRepositoryWriteTest {

    private val api = FakeTrainerRoutinesApi().apply {
        server["r1"] = routineDto(exercises = listOf(exerciseDto("a", 0), exerciseDto("b", 1), exerciseDto("c", 2)))
    }
    private val dao = FakeTrainerRoutinesDao()
    private val repo = TrainerRoutinesRepository(api, dao, Clock.systemUTC())

    private suspend fun order() = repo.observeRoutine("t1", "r1").first()!!.exercises.map { it.id }

    @Test fun `cambiar el descanso guarda lo que devuelve el servidor`() = runTest {
        repo.refreshRoutine("t1", "r1")
        val patch = buildJsonObject { put("rest_seconds", JsonPrimitive(120)) }
        assertTrue(repo.updateExercise("t1", "r1", "a", patch).isSuccess)
        assertEquals(120, repo.observeRoutine("t1", "r1").first()!!.exercises.first().restSeconds)
    }

    @Test fun `quitar el unico ejercicio da 409 y el ejercicio sigue`() = runTest {
        repo.refreshRoutine("t1", "r1")
        api.removeCode = 409
        val result = repo.removeExercise("t1", "r1", "a")
        assertEquals(DataError.Http(409), (result.exceptionOrNull() as DataException).error)
        assertEquals(listOf("a", "b", "c"), order())
    }

    @Test fun `quitar un ejercicio lo saca del cache`() = runTest {
        repo.refreshRoutine("t1", "r1")
        assertTrue(repo.removeExercise("t1", "r1", "b").isSuccess)
        assertEquals(listOf("a", "c"), order())
    }

    @Test fun `desactivar actualiza la fila de la lista`() = runTest {
        repo.refreshList("t1", "s1")
        repo.update("t1", "r1", routineActivePatch(false))
        assertFalse(repo.observeStudentRoutines("t1", "s1").first()!!.routines.single().active)
    }

    @Test fun `crear devuelve el id aunque falle el GET de despues`() = runTest {
        val request = CreateRoutineRequest("s1", "Pull", "strength", listOf("friday"), listOf())
        api.getGate = CompletableDeferred<Unit>().apply { completeExceptionally(IOException("se cortó")) }
        val result = repo.create("t1", request)
        assertEquals("new1", result.getOrNull())
        assertEquals(1, api.creates.size)
    }

    @Test fun `reorder falla y vuelve al orden anterior`() = runTest {
        repo.refreshRoutine("t1", "r1")
        api.error = IOException("sin red")
        val result = repo.reorder("t1", "r1", listOf("b", "a", "c"))
        assertTrue(result.isFailure)
        assertEquals(listOf("a", "b", "c"), order())
    }

    @Test fun `el orden local se ve mientras viaja el PUT`() = runTest {
        repo.refreshRoutine("t1", "r1")
        val gate = CompletableDeferred<Unit>().also { api.reorderGates.addLast(it) }
        val job = launch { repo.reorder("t1", "r1", listOf("c", "a", "b")) }
        runCurrent()
        assertEquals(listOf("c", "a", "b"), order())
        gate.complete(Unit)
        job.join()
        assertEquals(listOf("c", "a", "b"), order())
    }

    @Test fun `dos reorders seguidos terminan con el orden del ultimo`() = runTest {
        repo.refreshRoutine("t1", "r1")
        val first = CompletableDeferred<Unit>().also { api.reorderGates.addLast(it) }
        val a = async { repo.reorder("t1", "r1", listOf("b", "a", "c")) }
        runCurrent()
        val b = async { repo.reorder("t1", "r1", listOf("b", "c", "a")) }
        runCurrent()
        first.complete(Unit)
        runCurrent()
        // La respuesta del primero no pisa el orden local del segundo.
        assertEquals(listOf("b", "c", "a"), order())
        a.await(); b.await()
        assertEquals(listOf("b", "c", "a"), order())
        assertEquals(listOf(listOf("b", "a", "c"), listOf("b", "c", "a")), api.reorderCalls)
    }

    @Test fun `si el segundo reorder falla vuelve al orden confirmado por el primero`() = runTest {
        repo.refreshRoutine("t1", "r1")
        assertTrue(repo.reorder("t1", "r1", listOf("b", "a", "c")).isSuccess)
        api.error = IOException("sin red")
        repo.reorder("t1", "r1", listOf("c", "b", "a"))
        assertEquals(listOf("b", "a", "c"), order())
    }

    @Test fun `un GET que salio antes de un PATCH no pisa el valor nuevo`() = runTest {
        repo.refreshRoutine("t1", "r1")
        val gate = CompletableDeferred<Unit>()
        api.getGate = gate
        val refresh = launch { repo.refreshRoutine("t1", "r1") }
        runCurrent()
        val patch = launch { repo.updateExercise("t1", "r1", "a", buildJsonObject { put("rest_seconds", JsonPrimitive(30)) }) }
        runCurrent()
        api.getGate = null
        gate.complete(Unit)
        refresh.join(); patch.join()
        assertEquals(30, repo.observeRoutine("t1", "r1").first()!!.exercises.first().restSeconds)
    }
}
