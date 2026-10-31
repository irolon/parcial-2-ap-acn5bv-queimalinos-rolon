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
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import java.time.Instant

/**
 * Un refresh que no es del historial (el del badge) también reemplaza la página 1 y vuelve "Ver más" a la 2 (ronda 3 de
 * la PR #40). La 2 sigue guardada: el mismo toque la vuelve a pedir, no suma nada y sigue con la 3.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class HistoryViewModelRefreshExternoTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeSessionApi()
    private val session = FakeStudentSession()
    private val repository = HistoryRepository(api, FakeHistoryDao(), FakeWorkoutDao()) { session }
    private val vm by lazy {
        HistoryViewModel(
            repository, session, FakeConnectivityObserver(online = true), StepClock(Instant.parse("2026-10-30T12:00:00Z")),
        )
    }

    private fun page(id: String, number: Int) = HistoryPageDto(
        listOf(HistorySummaryDto(id, "2026-10-%02dT12:00:00Z".format(30 - number), sets = 1, volumeKg = 10.0)), HistoryMetaDto(1, number, 20, 4),
    )

    @Test fun unRefreshDirectoAlRepositorioVuelveVerMasALaDos() = runTest {
        api.historyPages = mapOf(1 to page("a", 1), 2 to page("b", 2), 3 to page("c", 3))
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"), "b" to HistoryDetailDto("b", "2026-10-29T12:00:00Z"))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        vm.onLoadMore() // pide la 2; el próximo sería la 3
        advanceUntilIdle()
        repository.refresh("u1") // como el badge: reemplaza la 1, la 2 queda
        advanceUntilIdle()
        vm.onLoadMore()
        advanceUntilIdle()
        assertEquals(listOf(1, 2, 1, 2, 3), api.historyRequests)
        assertEquals(listOf("a", "b", "c"), vm.uiState.value.items.map { it.id })
    }
}
