package com.fittrainer.ui.workout.history

import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistoryMetaDto
import com.fittrainer.data.api.history.HistoryPageDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.data.workout.history.HistoryRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import java.time.Instant

/**
 * Un refresh que llega mientras baja una página de "Ver más": la respuesta tardía no mueve ni el contador ni "hay más".
 * Ronda 3 de la PR #40: cada refresco vuelve "Ver más" a la página 2, y un toque sigue de largo por las páginas que no
 * suman nada nuevo hasta la primera que sí.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class HistoryViewModelVerMasObsoletoTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeSessionApi()
    private val session = FakeStudentSession()
    private val dao = FakeHistoryDao()
    private val repository = HistoryRepository(api, dao, FakeWorkoutDao()) { session }
    private val vm by lazy {
        HistoryViewModel(
            repository, session, FakeConnectivityObserver(online = true), StepClock(Instant.parse("2026-10-30T12:00:00Z")),
        )
    }

    /** Cada página una sesión, la 1 la más nueva (como las ordena el servidor). */
    private fun page(id: String, number: Int, totalPages: Int) = HistoryPageDto(
        listOf(HistorySummaryDto(id, "2026-10-%02dT12:00:00Z".format(30 - number), sets = 1, volumeKg = 10.0)), HistoryMetaDto(1, number, 20, totalPages),
    )

    @Test fun unRefreshConLaTresEnVueloVuelveALaDosYHayMasDelRefresh() = runTest {
        api.historyPages = mapOf(1 to page("a", 1, 4), 2 to page("b", 2, 4), 3 to page("c", 3, 3))
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        vm.onLoadMore() // la 2
        advanceUntilIdle()
        val gate = CompletableDeferred<Unit>()
        api.historyGates = mapOf(3 to gate)
        vm.onLoadMore() // la 3 queda volando
        advanceUntilIdle()
        repository.refresh("u1") // como el badge: reemplaza la 1 (la 2 queda guardada)
        gate.complete(Unit)
        advanceUntilIdle()
        assertTrue(vm.uiState.value.hasMore) // la 3 era la última, pero eso ya no vale
        assertTrue(!vm.uiState.value.loadingMore)
        vm.onLoadMore()
        advanceUntilIdle()
        assertEquals(listOf(1, 2, 3, 1, 2, 3), api.historyRequests) // la 2 ya estaba: el mismo toque sigue a la 3
    }

    @Test fun despuesDeUnRefrescoVerMasRepideLaDosYSigueALaTresEnUnToque() = runTest {
        api.historyPages = mapOf(1 to page("a", 1, 3), 2 to page("b", 2, 3), 3 to page("c", 3, 3))
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart(); advanceUntilIdle()
        vm.onLoadMore(); advanceUntilIdle() // la 2
        vm.onPullToRefresh(); advanceUntilIdle()
        assertTrue(vm.uiState.value.hasMore)
        assertEquals(listOf("a", "b"), vm.uiState.value.items.map { it.id })
        vm.onLoadMore(); advanceUntilIdle()
        assertEquals(listOf(1, 2, 1, 2, 3), api.historyRequests)
        assertTrue(!vm.uiState.value.hasMore)
    }

    // Re-revisión ronda 1: con borrado completo (hueco posible) "Ver más" también vuelve a la 2.
    @Test fun despuesDeUnRefrescoConBorradoCompletoVerMasVuelveAPedirLaDos() = runTest {
        api.historyPages = mapOf(1 to page("a", 1, 3), 2 to page("b", 2, 3))
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"), "n" to HistoryDetailDto("n", "2026-10-30T12:00:00Z"))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart(); advanceUntilIdle()
        vm.onLoadMore(); advanceUntilIdle() // la 2: el próximo sería la 3
        val nueva = HistorySummaryDto("n", "2026-10-30T12:00:00Z", sets = 1, volumeKg = 10.0)
        api.historyPages = api.historyPages + (1 to HistoryPageDto(listOf(nueva), HistoryMetaDto(3, 1, 20, 3))) // ninguna conocida
        vm.onPullToRefresh(); advanceUntilIdle()
        vm.onLoadMore(); advanceUntilIdle()
        assertEquals(listOf(1, 2, 1, 2), api.historyRequests)
    }
}
