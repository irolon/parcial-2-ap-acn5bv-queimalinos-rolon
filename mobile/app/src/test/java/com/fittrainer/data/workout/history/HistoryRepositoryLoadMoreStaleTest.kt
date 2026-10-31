package com.fittrainer.data.workout.history

import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistoryMetaDto
import com.fittrainer.data.api.history.HistoryPageDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

/** "Ver más" en vuelo mientras otro refresh reemplaza la página 1: la página tardía no se escribe. */
@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class HistoryRepositoryLoadMoreStaleTest {
    private val api = FakeSessionApi()
    private val dao = FakeHistoryDao()
    private val session = FakeStudentSession()
    private val repository = HistoryRepository(api, dao, FakeWorkoutDao()) { session }

    private fun page(id: String, number: Int, totalPages: Int) = HistoryPageDto(
        listOf(HistorySummaryDto(id, "2026-10-29T12:00:00Z", sets = 1, volumeKg = 10.0)), HistoryMetaDto(1, number, 20, totalPages),
    )

    @Test fun unRefreshEntreElPedidoYLaRespuestaDejaLaPaginaSinEscribirYDiceObsoleta() = runTest {
        api.historyPages = mapOf(1 to page("a", 1, 3), 3 to page("c", 3, 3))
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"))
        repository.refresh("u1")
        val gate = CompletableDeferred<Unit>()
        api.historyGates = mapOf(3 to gate)
        val result = async { repository.loadMore("u1", 3) }
        runCurrent() // la 3 ya salió y espera
        repository.refresh("u1") // reemplaza la página 1 mientras la 3 vuela
        gate.complete(Unit)
        assertEquals(LoadMoreResult.Stale, result.await().getOrThrow())
        assertFalse("c" in dao.state.value.sessions)
    }

    @Test fun sinRefreshEnMedioDevuelveLaPaginaYSiHayMas() = runTest {
        api.historyPages = mapOf(3 to page("c", 3, 4))
        assertEquals(LoadMoreResult.Page(hasMore = true), repository.loadMore("u1", 3).getOrThrow())
        assertEquals(LoadMoreResult.Page(hasMore = false), repository.loadMore("u1", 4).getOrThrow())
    }
}
