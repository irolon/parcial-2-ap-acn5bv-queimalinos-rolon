package com.fittrainer.data.challenges.trainer

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.challenges.FakeTrainerChallengesApi
import com.fittrainer.testing.fakes.challenges.FakeTrainerChallengesDao
import com.fittrainer.testing.fakes.challenges.assignmentDto
import com.fittrainer.testing.fakes.challenges.challengeDto
import java.io.IOException
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainerChallengesRepositoryTest {

    private val api = FakeTrainerChallengesApi()
    private val dao = FakeTrainerChallengesDao()
    private val repo = TrainerChallengesRepository(api, dao, MutableClock(1_000))

    private suspend fun student(id: String = "s1") = repo.observeStudent("t1", id).first()

    @Test fun `sin bajar nunca la lista es null y despues respeta el orden del backend`() = runTest {
        assertNull(repo.observeCatalog("t1").first())
        api.challenges = listOf(challengeDto("z", "Zeta"), challengeDto("a", "Alfa", own = true))
        assertTrue(repo.refreshCatalog("t1").isSuccess)
        val cache = repo.observeCatalog("t1").first()!!
        assertEquals(listOf("z", "a"), cache.challenges.map { it.id })
        assertEquals(listOf(false, true), cache.challenges.map { it.own })
        assertEquals(1_000L, cache.fetchedAt.toEpochMilli())
    }

    @Test fun `el avance del alumno pone las activas primero`() = runTest {
        val c1 = challengeDto("c1", "Uno")
        api.assignments["s1"] = listOf(
            assignmentDto("old", c1, status = "completed", startedAt = "2026-11-20T12:00:00Z"),
            assignmentDto("act", c1, startedAt = "2026-10-01T12:00:00Z"),
        )
        repo.refreshStudent("t1", "s1")
        assertEquals(listOf("act", "old"), student()!!.items.map { it.id })
    }

    @Test fun `asignar a uno guarda la asignacion en Room`() = runTest {
        repo.refreshStudent("t1", "s1")
        assertTrue(repo.assignToStudent("t1", "s1", "c1").isSuccess)
        assertEquals(listOf("c1"), student()!!.items.map { it.challengeId })
        assertEquals("s1" to "c1", api.singleCalls.single())
    }

    @Test fun `ya activo da ChallengeAlreadyActiveException`() = runTest {
        repo.assignToStudent("t1", "s1", "c1")
        val error = repo.assignToStudent("t1", "s1", "c1").exceptionOrNull()
        assertTrue(error is ChallengeAlreadyActiveException)
    }

    @Test fun `un 404 del desafio lo saca del cache`() = runTest {
        repo.refreshCatalog("t1")
        api.challenges = api.challenges.filter { it.id != "c1" }
        assertTrue(repo.assignToStudent("t1", "s1", "c1").exceptionOrNull() is ChallengeGoneException)
        assertEquals(listOf("c2"), repo.observeCatalog("t1").first()!!.challenges.map { it.id })
    }

    @Test fun `un 403 del alumno es NotFound`() = runTest {
        api.writeError = apiError(403, "FORBIDDEN")
        val error = repo.assignToStudent("t1", "s1", "c1").exceptionOrNull() as DataException
        assertEquals(DataError.NotFound, error.error)
    }

    @Test fun `sin red es Offline y no toca Room`() = runTest {
        api.writeError = IOException("sin red")
        val error = repo.assignToStudent("t1", "s1", "c1").exceptionOrNull() as DataException
        assertEquals(DataError.Offline, error.error)
        assertTrue(dao.assignments.value.isEmpty())
    }

    @Test fun `el lote separa creados, ya activos y ajenos y guarda cada uno con su alumno`() = runTest {
        repo.assignToStudent("t1", "s2", "c1")
        val result = repo.assignMany("t1", "c1", listOf("s1", "s2", "x9", "s3")).getOrThrow()
        assertEquals(listOf("s1", "s3"), result.created)
        assertEquals(listOf("s2"), result.alreadyActive)
        assertEquals(listOf("x9"), result.notYours)
        assertEquals(listOf("s1", "s2", "s3"), dao.assignments.value.map { it.studentId }.distinct().sorted())
        assertEquals(1, api.batchCalls.size)
    }

    @Test fun `cerrar sesion borra el cache del entrenador`() = runTest {
        repo.refreshCatalog("t1")
        repo.assignToStudent("t1", "s1", "c1")
        repo.clearUserData("t1")
        assertNull(repo.observeCatalog("t1").first())
        assertTrue(dao.assignments.value.isEmpty())
    }

    // Ronda 1 de Codex: lo que el servidor confirmó se ve aunque la lista completa del alumno no se haya bajado.
    @Test fun `asignar sin GET previo deja ver la asignacion sin marcarla como sincronizada`() = runTest {
        repo.assignToStudent("t1", "s1", "c1")
        val cache = student()!!
        assertEquals(listOf("c1"), cache.items.map { it.challengeId })
        assertNull(cache.fetchedAt)
    }

    @Test fun `el lote sin GET previo tambien queda visible por alumno`() = runTest {
        repo.assignMany("t1", "c2", listOf("s1", "s2"))
        assertEquals(listOf("c2"), student("s1")!!.items.map { it.challengeId })
        assertEquals(listOf("c2"), student("s2")!!.items.map { it.challengeId })
        assertNull(student("s3"))
    }
}
