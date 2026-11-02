package com.fittrainer.data.routines.trainer

import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.routines.exerciseDto
import com.fittrainer.testing.fakes.routines.routineDto
import java.io.IOException
import java.time.Clock
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Reorder ante fallas y cancelación (ronda 1 de Codex). */
class TrainerRoutinesRepositoryReorderTest {

    private val api = FakeTrainerRoutinesApi().apply {
        server["r1"] = routineDto(exercises = listOf(exerciseDto("a", 0), exerciseDto("b", 1), exerciseDto("c", 2)))
    }
    private val dao = FakeTrainerRoutinesDao()
    private val repo = TrainerRoutinesRepository(api, dao, Clock.systemUTC())

    private suspend fun order() = repo.observeRoutine("t1", "r1").first()!!.exercises.map { it.id }

    /** Lo que tiene el servidor, sin pasar por la app (otra pestaña, la web, un PUT que llegó). */
    private fun serverOrder(vararg ids: String) {
        val r = api.server.getValue("r1")
        val byId = r.exercises.associateBy { it.id }
        api.server["r1"] = r.copy(exercises = ids.mapIndexed { i, id -> byId.getValue(id).copy(orderIndex = i) })
    }

    @Test fun `si el PUT falla con el servidor accesible, Room queda como el servidor`() = runTest {
        repo.refreshRoutine("t1", "r1")
        serverOrder("c", "a", "b")
        api.reorderError = httpError(500)
        assertTrue(repo.reorder("t1", "r1", listOf("b", "a", "c")).isFailure)
        assertEquals(listOf("c", "a", "b"), order())
    }

    @Test fun `cancelar a mitad del PUT cierra el ticket y un reorder fallido despues vuelve al orden refrescado`() = runTest {
        repo.refreshRoutine("t1", "r1")
        api.reorderGates.addLast(CompletableDeferred())
        val job = launch { repo.reorder("t1", "r1", listOf("b", "a", "c")) }
        runCurrent()
        job.cancel()
        runCurrent()
        // El servidor sí lo aplicó; al volver a entrar, el editor refresca.
        serverOrder("b", "a", "c")
        repo.refreshRoutine("t1", "r1")
        assertEquals(listOf("b", "a", "c"), order())
        // Sin red, un reorder nuevo falla y vuelve a lo refrescado, no al orden de antes de la cancelación.
        api.error = IOException("sin red")
        assertTrue(repo.reorder("t1", "r1", listOf("c", "b", "a")).isFailure)
        assertEquals(listOf("b", "a", "c"), order())
    }

    @Test fun `un GET en vuelo al tocar flecha no pisa el orden local ni un segundo movimiento`() = runTest {
        repo.refreshRoutine("t1", "r1")
        val seen = mutableListOf<List<String>>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            repo.observeRoutine("t1", "r1").collect { d -> d?.let { seen += it.exercises.map { e -> e.id } } }
        }
        val get = CompletableDeferred<Unit>().also { api.getGate = it }
        val put = CompletableDeferred<Unit>().also { api.reorderGates.addLast(it) }
        launch { repo.refreshRoutine("t1", "r1") } // el refresh del onStart del editor, con el Mutex tomado
        runCurrent()
        launch { repo.reorder("t1", "r1", listOf("b", "a", "c")) }
        runCurrent()
        val afterTap = seen.size
        assertEquals(listOf("b", "a", "c"), seen.last())
        api.getGate = null
        get.complete(Unit) // el GET vuelve con el orden de antes del PUT (a, b, c)
        runCurrent()
        assertTrue("Room no muestra el orden viejo: $seen", seen.drop(afterTap).none { it == listOf("a", "b", "c") })
        // Segundo movimiento, calculado sobre lo que se ve: c sube un lugar.
        assertEquals(listOf("b", "a", "c"), order())
        launch { repo.reorder("t1", "r1", listOf("b", "c", "a")) }
        runCurrent()
        put.complete(Unit)
        runCurrent()
        assertEquals(listOf("b", "c", "a"), order())
        assertEquals(listOf("b", "c", "a"), api.server.getValue("r1").exercises.sortedBy { it.orderIndex }.map { it.id })
        assertTrue("nunca volvió atrás: $seen", seen.drop(afterTap).none { it == listOf("a", "b", "c") })
    }

    @Test fun `cancelar mientras se aplica el orden local cierra el ticket y el refresh trae el del servidor`() = runTest {
        repo.refreshRoutine("t1", "r1")
        dao.setOrderGate = CompletableDeferred()
        val job = launch { repo.reorder("t1", "r1", listOf("b", "a", "c")) }
        runCurrent() // trabado dentro de applyOrder, con el ticket ya abierto
        job.cancel()
        runCurrent()
        dao.setOrderGate = null
        // El PUT nunca salió: al volver a entrar, el GET manda y no se le impone el orden pendiente.
        assertEquals(listOf("a", "b", "c"), api.server.getValue("r1").exercises.sortedBy { it.orderIndex }.map { it.id })
        repo.refreshRoutine("t1", "r1")
        assertEquals(listOf("a", "b", "c"), order())
    }
}
