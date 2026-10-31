package com.fittrainer.data.workout.history

import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistoryMetaDto
import com.fittrainer.data.api.history.HistoryPageDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.httpError
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** El refresco en dos fases: la lista (rápida) y después los detalles (de a uno). */
class HistoryRepositoryPhasesTest {
    private val api = FakeSessionApi()
    private val session = FakeStudentSession()
    private val dao = FakeHistoryDao()
    private val repository = HistoryRepository(api, dao, FakeWorkoutDao()) { session }

    private fun summary(id: String) = HistorySummaryDto(id, "2026-10-29T12:00:00Z", sets = 1, volumeKg = 10.0)
    private fun page(vararg ids: String) = HistoryPageDto(ids.map { summary(it) }, HistoryMetaDto(ids.size, 1, 20, 1))
    private fun detail(id: String) = HistoryDetailDto(id, "2026-10-29T12:00:00Z")

    @Test fun refreshListGuardaLaPaginaSinPedirDetalles() = runTest {
        api.historyPages = mapOf(1 to page("a", "b"))
        val pending = repository.refreshList("u1").getOrThrow()
        assertEquals(listOf("a", "b"), pending.ids)
        assertEquals(setOf("a", "b"), dao.state.value.sessions.keys)
        assertTrue(api.detailCalls.isEmpty())
        assertEquals(1, repository.refreshGeneration.value)
    }

    @Test fun refreshDetailsBajaLosPendientes() = runTest {
        api.historyPages = mapOf(1 to page("a", "b"))
        api.details = mapOf("a" to detail("a"), "b" to detail("b"))
        val pending = repository.refreshList("u1").getOrThrow()
        assertTrue(repository.refreshDetails("u1", pending).isSuccess)
        assertEquals(listOf("a", "b"), api.detailCalls)
    }

    @Test fun refreshDetailsCortaConLaRedYRespetaLaLimpieza() = runTest {
        api.historyPages = mapOf(1 to page("a", "b"))
        val pending = repository.refreshList("u1").getOrThrow()
        api.failDetails = setOf("a")
        assertTrue(repository.refreshDetails("u1", pending).isFailure)
        assertEquals(listOf("a"), api.detailCalls)
        repository.clearUserData("u1")
        api.failDetails = emptySet()
        api.details = mapOf("a" to detail("a"), "b" to detail("b"))
        assertTrue(repository.refreshDetails("u1", pending).isFailure) // la limpieza invalida los pendientes
    }

    @Test fun refreshDetailsSigueConHttpYAvisaElFallo() = runTest {
        api.historyPages = mapOf(1 to page("a", "b"))
        api.details = mapOf("b" to detail("b"))
        api.failDetails = setOf("a")
        api.detailFailure = httpError(500)
        val pending = repository.refreshList("u1").getOrThrow()
        assertTrue(repository.refreshDetails("u1", pending).isFailure)
        assertEquals(listOf("a", "b"), api.detailCalls)
    }
}
