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

/** Un refresh que llega mientras baja una página de "Ver más": la respuesta tardía no mueve ni el contador ni "hay más". */
@OptIn(ExperimentalCoroutinesApi::class)
class HistoryViewModelVerMasObsoletoTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeSessionApi()
    private val session = FakeStudentSession()
    private val repository = HistoryRepository(api, FakeHistoryDao(), FakeWorkoutDao()) { session }
    private val vm by lazy {
        HistoryViewModel(
            repository, session, FakeConnectivityObserver(online = true), StepClock(Instant.parse("2026-10-30T12:00:00Z")),
        )
    }

    private fun page(id: String, number: Int, totalPages: Int) = HistoryPageDto(
        listOf(HistorySummaryDto(id, "2026-10-29T12:00:00Z", sets = 1, volumeKg = 10.0)), HistoryMetaDto(1, number, 20, totalPages),
    )

    @Test fun unRefreshConLaTresEnVueloDejaElProximoPedidoEnLaDosYHayMasDelRefresh() = runTest {
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
        repository.refresh("u1") // como el badge: reemplaza la 1 y borra "Ver más"
        gate.complete(Unit)
        advanceUntilIdle()
        assertTrue(vm.uiState.value.hasMore) // la 3 era la última, pero eso ya no vale
        assertTrue(!vm.uiState.value.loadingMore)
        vm.onLoadMore()
        advanceUntilIdle()
        assertEquals(listOf(1, 2, 3, 1, 2), api.historyRequests)
    }
}
