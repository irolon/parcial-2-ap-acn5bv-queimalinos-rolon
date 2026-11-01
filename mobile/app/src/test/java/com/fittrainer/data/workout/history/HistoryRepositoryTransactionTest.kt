package com.fittrainer.data.workout.history

import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistoryMetaDto
import com.fittrainer.data.api.history.HistoryPageDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

/** El chequeo + escritura de "Ver más" y el reemplazo + aviso del refresh van dentro de la transacción de Room. */
class HistoryRepositoryTransactionTest {
    private val api = FakeSessionApi()
    private val dao = FakeHistoryDao()
    private val repository = HistoryRepository(api, dao, FakeWorkoutDao()) { FakeStudentSession() }

    private fun page(id: String, number: Int, totalPages: Int) = HistoryPageDto(
        listOf(HistorySummaryDto(id, "2026-10-29T12:00:00Z", sets = 1, volumeKg = 10.0)), HistoryMetaDto(1, number, 20, totalPages),
    )

    @Test fun verMasEscribeDentroDeLaTransaccion() = runTest {
        api.historyPages = mapOf(3 to page("c", 3, 4))
        repository.loadMore("u1", 3)
        assertEquals(listOf("insertIfAbsent tx=true"), dao.writes)
    }

    @Test fun elRefreshReemplazaYAvisaDentroDeLaMismaTransaccion() = runTest {
        api.historyPages = mapOf(1 to page("a", 1, 1))
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"))
        var generationAtCommit = -1
        dao.beforeCommit = { generationAtCommit = repository.refreshGeneration.value }
        repository.refreshList("u1")
        assertEquals(listOf("upsertSessions tx=true"), dao.writes)
        assertEquals("el aviso se da antes de cerrar la transacción", 1, generationAtCommit)
    }
}
