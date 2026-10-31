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
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.httpError
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import java.time.Instant

@OptIn(ExperimentalCoroutinesApi::class)
class HistoryViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeSessionApi()
    private val connectivity = FakeConnectivityObserver(online = true)
    private val workoutDao = FakeWorkoutDao()
    private val clock = StepClock(Instant.parse("2026-10-30T12:00:00Z"))
    private val session = FakeStudentSession()
    private val vm by lazy {
        HistoryViewModel(HistoryRepository(api, FakeHistoryDao(), workoutDao) { session }, session, connectivity, clock)
    }

    private fun summary(id: String) = HistorySummaryDto(id, "2026-10-29T12:00:00Z", sets = 1, volumeKg = 10.0)

    @Test fun alEntrarRefrescaYMuestraLaLista() = runTest {
        api.historyPages = mapOf(1 to HistoryPageDto(listOf(summary("a")), HistoryMetaDto(1, 1, 20, 2)))
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        val state = vm.uiState.value
        assertEquals(listOf("a"), state.items.map { it.id })
        assertTrue(state.hasMore)
        assertTrue(state.everLoaded)
    }

    @Test fun sinRedNoAvisaErrorYMuestraOffline() = runTest {
        connectivity.state.value = false
        api.historyError = java.io.IOException("sin red")
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.isOffline)
        assertFalse(vm.uiState.value.refreshFailed)
    }

    @Test fun unQuinientosConRedAvisaQueNoSePudoActualizar() = runTest {
        api.historyError = httpError(503)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.refreshFailed)
    }

    @Test fun verMasSinRedEmiteNecesitaConexion() = runTest {
        connectivity.state.value = false
        val event = backgroundScope.async(UnconfinedTestDispatcher(testScheduler)) { vm.events.first() }
        vm.onLoadMore()
        advanceUntilIdle()
        assertEquals(HistoryEvent.NeedsConnection, event.await())
    }

    private fun page(vararg ids: String, totalPages: Int = 3, page: Int = 1) =
        HistoryPageDto(ids.map { summary(it) }, HistoryMetaDto(ids.size, page, 20, totalPages))

    @Test fun refrescoParcialFallidoDejaVerMasEnLaPagina2() = runTest {
        api.historyPages = mapOf(1 to page("a"), 2 to page("b", page = 2))
        api.details = mapOf("b" to HistoryDetailDto("b", "2026-10-29T12:00:00Z"))
        api.failDetails = setOf("a")
        api.detailFailure = httpError(500)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.hasMore)
        assertTrue(vm.uiState.value.refreshFailed)
        vm.onLoadMore()
        advanceUntilIdle()
        assertEquals(listOf(1, 2), api.historyRequests)
        assertEquals(setOf("a", "b"), vm.uiState.value.items.map { it.id }.toSet())
    }

    @Test fun sinRedNiCacheConSesionLocalNoCuentaComoHistorialBajado() = runTest {
        connectivity.state.value = false
        api.historyError = java.io.IOException("sin red")
        workoutDao.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession()))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        assertFalse(vm.uiState.value.everLoaded)
        assertEquals(listOf("w1"), vm.uiState.value.items.map { it.id })
    }

    @Test fun verMasConUnQuinientosEmiteNoSePudoCargar() = runTest {
        api.historyPages = mapOf(1 to page("a"))
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        api.historyError = httpError(503)
        val event = backgroundScope.async(UnconfinedTestDispatcher(testScheduler)) { vm.events.first() }
        vm.onLoadMore()
        advanceUntilIdle()
        assertEquals(HistoryEvent.LoadMoreFailed, event.await())
    }

    @Test fun alVolverLaRedReintentaSiElRefrescoNoSalio() = runTest {
        connectivity.state.value = false
        api.historyError = java.io.IOException("sin red")
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        assertFalse(vm.uiState.value.everLoaded)
        api.historyError = null
        api.historyPages = mapOf(1 to page("a"))
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"))
        connectivity.state.value = true
        advanceUntilIdle()
        assertEquals(2, api.historyRequests.size)
        assertTrue(vm.uiState.value.everLoaded)
        assertEquals(listOf("a"), vm.uiState.value.items.map { it.id })
    }

    @Test fun alVolverLaRedNoRefrescaSiYaSalioBien() = runTest {
        api.historyPages = mapOf(1 to page("a"))
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        connectivity.state.value = false
        advanceUntilIdle()
        connectivity.state.value = true
        advanceUntilIdle()
        assertEquals(1, api.historyRequests.size)
    }

    @Test fun onStartNoRefrescaSiSeActualizoHaceMenosDeCincoMinutos() = runTest {
        api.historyPages = mapOf(1 to page("a"))
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        clock.now = clock.now.plusSeconds(4 * 60)
        vm.onStart()
        advanceUntilIdle()
        assertEquals(1, api.historyRequests.size)
        vm.onPullToRefresh()
        advanceUntilIdle()
        assertEquals(2, api.historyRequests.size)
        clock.now = clock.now.plusSeconds(6 * 60)
        vm.onStart()
        advanceUntilIdle()
        assertEquals(3, api.historyRequests.size)
    }
}
