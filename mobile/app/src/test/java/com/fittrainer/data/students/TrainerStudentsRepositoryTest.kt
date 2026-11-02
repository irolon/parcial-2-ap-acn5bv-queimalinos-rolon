package com.fittrainer.data.students

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.students.FakeStudentsApi
import com.fittrainer.testing.fakes.students.FakeTrainerStudentsDao
import com.fittrainer.testing.fakes.students.studentDto
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainerStudentsRepositoryTest {

    private val clock = Clock.fixed(Instant.ofEpochMilli(5_000L), ZoneOffset.UTC)
    private val api = FakeStudentsApi()
    private val dao = FakeTrainerStudentsDao()
    private val repo = TrainerStudentsRepository(api, dao, clock)

    @Test fun `sin sync el cache sale vacio y sin fecha`() = runTest {
        val cache = repo.observe("t1").first()
        assertTrue(cache.students.isEmpty())
        assertNull(cache.lastSyncedAt)
    }

    @Test fun `trae todas las paginas de activos y de baja antes de guardar`() = runTest {
        api.pages = mapOf(
            true to listOf(listOf(studentDto("a1"), studentDto("a2")), listOf(studentDto("a3"))),
            false to listOf(listOf(studentDto("b1", active = false))),
        )
        assertTrue(repo.refresh("t1").isSuccess)

        val cache = repo.observe("t1").first()
        assertEquals(setOf("a1", "a2", "a3", "b1"), cache.students.map { it.id }.toSet())
        assertEquals(Instant.ofEpochMilli(5_000L), cache.lastSyncedAt)
        assertEquals(listOf(true to 1, true to 2, false to 1), api.calls)
    }

    @Test fun `sin dados de baja pide una sola pagina de baja y no sigue`() = runTest {
        api.pages = mapOf(true to listOf(listOf(studentDto("a1"))))
        repo.refresh("t1")
        assertEquals(listOf(true to 1, false to 1), api.calls)
    }

    @Test fun `un error en la segunda pagina deja el cache anterior intacto`() = runTest {
        api.pages = mapOf(true to listOf(listOf(studentDto("viejo"))))
        repo.refresh("t1")
        api.pages = mapOf(true to listOf(listOf(studentDto("n1")), listOf(studentDto("n2"))))
        api.failOn = true to 2

        val result = repo.refresh("t1")

        assertEquals(DataError.Offline, (result.exceptionOrNull() as DataException).error)
        assertEquals(listOf("viejo"), repo.observe("t1").first().students.map { it.id })
    }

    @Test fun `otro entrenador no ve el cache y lo ve como nunca sincronizado`() = runTest {
        repo.refresh("t1")
        val other = repo.observe("t2").first()
        assertTrue(other.students.isEmpty())
        assertNull(other.lastSyncedAt)
    }

    @Test fun `clearUserData borra solo si el duenio coincide y null borra todo`() = runTest {
        repo.refresh("t1")
        repo.clearUserData("t2")
        assertEquals(1, repo.observe("t1").first().students.size)
        repo.clearUserData("t1")
        assertTrue(repo.observe("t1").first().students.isEmpty())

        repo.refresh("t1")
        repo.clearUserData(null)
        assertNull(dao.state.value.sync)
    }
}
