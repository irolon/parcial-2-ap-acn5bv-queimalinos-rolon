package com.fittrainer.data.students.sessions

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.students.FakeTrainerSessionsDao
import com.fittrainer.testing.fakes.students.sessionDetail
import com.fittrainer.testing.fakes.students.sessionPage
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.httpError
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class StudentSessionsRepositoryTest {

    private val api = FakeSessionApi()
    private val dao = FakeTrainerSessionsDao()
    private val repo = StudentSessionsRepository(api, dao, Clock.fixed(Instant.ofEpochMilli(7_000), ZoneOffset.UTC))

    private suspend fun ids(student: String = "s") = repo.observeLatest("t1", student).first().items.map { it.id }

    @Test fun `refrescar a un alumno no toca la lista cacheada de otro`() = runTest {
        api.historyPages = mapOf(1 to sessionPage("a1", "a2"))
        repo.refreshLatest("t1", "alumnoA")
        api.historyPages = mapOf(1 to sessionPage("b1"))
        repo.refreshLatest("t1", "alumnoB")
        assertEquals(listOf("a1", "a2"), ids("alumnoA"))
        assertEquals(listOf("b1"), ids("alumnoB"))
    }

    @Test fun `Ver mas guarda la pagina en Room, sin repetidos y en orden`() = runTest {
        // Entre la página 1 y la 2 entró una sesión nueva: a2 viene repetida en la 2.
        api.historyPages = mapOf(1 to sessionPage("a1", "a2", totalPages = 3), 2 to sessionPage("a2", "a3", totalPages = 3, page = 2))
        repo.refreshLatest("t1", "s")
        assertTrue(repo.loadMore("t1", "s").isSuccess)
        assertEquals(listOf("a1", "a2", "a3"), ids())
        assertTrue(repo.observeLatest("t1", "s").first().hasMore)
        assertEquals(listOf(1, 2), api.historyRequests)
    }

    @Test fun `Ver mas o refresh sin red no tocan lo ya traido`() = runTest {
        api.historyPages = mapOf(1 to sessionPage("a1", totalPages = 2), 2 to sessionPage("a2", totalPages = 2, page = 2))
        repo.refreshLatest("t1", "s")
        repo.loadMore("t1", "s")
        api.historyError = IOException("sin red")
        assertEquals(DataError.Offline, (repo.refreshLatest("t1", "s").exceptionOrNull() as DataException).error)
        assertTrue(repo.loadMore("t1", "s").isFailure)
        assertEquals(listOf("a1", "a2"), ids())
        assertFalse(repo.observeLatest("t1", "s").first().hasMore)
    }

    @Test fun `un refresh exitoso vuelve a la pagina 1`() = runTest {
        api.historyPages = mapOf(1 to sessionPage("a1", totalPages = 2), 2 to sessionPage("a2", totalPages = 2, page = 2))
        repo.refreshLatest("t1", "s")
        repo.loadMore("t1", "s")
        repo.refreshLatest("t1", "s")
        assertEquals(listOf("a1"), ids())
        assertTrue(repo.observeLatest("t1", "s").first().hasMore)
    }

    @Test fun `el detalle se guarda y sobrevive al refresh de la lista`() = runTest {
        api.historyPages = mapOf(1 to sessionPage("a1"))
        api.details = mapOf("a1" to sessionDetail("a1"))
        repo.refreshLatest("t1", "s")
        repo.refreshDetail("t1", "s", "a1")
        repo.refreshLatest("t1", "s")
        assertEquals("Press banca", repo.observeDetail("t1", "a1").first()!!.exercises.single().originalName)
    }

    @Test fun `el comentario actualiza el resumen y el detalle, y vacio lo borra`() = runTest {
        api.historyPages = mapOf(1 to sessionPage("a1"))
        api.details = mapOf("a1" to sessionDetail("a1"))
        repo.refreshLatest("t1", "s")
        repo.refreshDetail("t1", "s", "a1")
        repo.saveComment("t1", "s", "a1", "  Buen ritmo  ")
        assertEquals("Buen ritmo", api.comments.single().second.trainerComment)
        assertEquals("Buen ritmo", repo.observeDetail("t1", "a1").first()!!.trainerComment)
        assertTrue(repo.observeLatest("t1", "s").first().items.single().hasComment)
        repo.saveComment("t1", "s", "a1", "   ")
        assertNull(api.comments.last().second.trainerComment)
        assertNull(repo.observeDetail("t1", "a1").first()!!.trainerComment)
    }

    @Test fun `un GET de lista que sale antes del comentario no lo pisa`() = runTest {
        api.historyPages = mapOf(1 to sessionPage("a1"))
        api.details = mapOf("a1" to sessionDetail("a1"))
        repo.refreshLatest("t1", "s")
        api.historyGates = mapOf(1 to CompletableDeferred())
        val list = launch { repo.refreshLatest("t1", "s") }
        runCurrent()
        val comment = launch { repo.saveComment("t1", "s", "a1", "Nuevo") }
        runCurrent()
        assertTrue(api.comments.isEmpty())
        api.historyGates.getValue(1).complete(Unit)
        list.join()
        comment.join()
        assertEquals("Nuevo", repo.observeDetail("t1", "a1").first()!!.trainerComment)
    }

    @Test fun `el detalle y el comentario van de a uno y gana el ultimo en terminar`() = runTest {
        api.details = mapOf("a1" to sessionDetail("a1"))
        api.detailGate = CompletableDeferred()
        val detail = launch { repo.refreshDetail("t1", "s", "a1") }
        runCurrent()
        val comment = launch { repo.saveComment("t1", "s", "a1", "Nuevo") }
        runCurrent()
        assertTrue(api.comments.isEmpty())
        api.detailGate!!.complete(Unit)
        detail.join()
        comment.join()
        assertEquals(listOf("a1" to null, "a1" to "Nuevo"), dao.writes)
    }

    @Test fun `404 en el detalle o el comentario es NotFound y saca la sesion del cache`() = runTest {
        api.historyPages = mapOf(1 to sessionPage("a1"))
        repo.refreshLatest("t1", "s")
        api.details = mapOf("a1" to sessionDetail("a1"))
        api.commentError = httpError(404)
        assertEquals(DataError.NotFound, (repo.saveComment("t1", "s", "a1", "x").exceptionOrNull() as DataException).error)
        assertNull(repo.observeDetail("t1", "a1").first())
        assertTrue(ids().isEmpty())
    }

    @Test fun `otro entrenador no ve nada y clearUserData borra solo lo suyo`() = runTest {
        api.historyPages = mapOf(1 to sessionPage("a1"))
        repo.refreshLatest("t1", "s")
        assertTrue(repo.observeLatest("t2", "s").first().items.isEmpty())
        repo.clearUserData("t2")
        assertEquals(1, ids().size)
        repo.clearUserData("t1")
        assertTrue(ids().isEmpty())
    }
}
