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
        assertEquals(LoadMoreResult.Page(hasMore = true, nextPage = 4), repository.loadMore("u1", 3).getOrThrow())
        assertEquals(LoadMoreResult.Page(hasMore = false, nextPage = 5), repository.loadMore("u1", 4).getOrThrow())
    }

    private fun old(id: String, day: Int, comment: String? = null, sets: Int = 1) =
        HistorySummaryDto(id, "2026-10-%02dT12:00:00Z".format(day), sets = sets, volumeKg = 10.0, trainerComment = comment)

    @Test fun verMasActualizaElResumenDeLasQueYaTraeEsaPaginaPeroNoLasDeLasVeinte() = runTest {
        api.historyPages = mapOf(1 to HistoryPageDto(listOf(old("a", 20)), HistoryMetaDto(3, 1, 20, 2)))
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-20T12:00:00Z"), "v" to HistoryDetailDto("v", "2026-10-05T12:00:00Z"),
            "w" to HistoryDetailDto("w", "2026-10-04T12:00:00Z"))
        repository.refresh("u1")
        api.historyPages = api.historyPages + (2 to HistoryPageDto(listOf(old("v", 5), old("w", 4)), HistoryMetaDto(3, 2, 20, 2)))
        repository.loadMore("u1", 2)
        repository.loadDetail("u1", "v"); repository.loadDetail("u1", "w")
        // El entrenador comenta "v", "w" suma una serie y "a" (de las 20) viene distinta en la página 2.
        api.historyPages = api.historyPages + (2 to HistoryPageDto(listOf(old("a", 20, sets = 9), old("v", 5, "Bien"), old("w", 4, sets = 2)), HistoryMetaDto(3, 2, 20, 2)))
        repository.loadMore("u1", 2)
        val st = dao.state.value.sessions
        assertEquals("Bien", st.getValue("v").trainerComment)
        assertEquals(true, st.getValue("v").detailLoaded) // solo cambió el comentario: el detalle sirve
        assertEquals(false, st.getValue("w").detailLoaded) // cambiaron las series: se vuelve a bajar al abrirla
        assertEquals(1, st.getValue("a").sets) // es del refresco: "Ver más" no la toca
    }
}
