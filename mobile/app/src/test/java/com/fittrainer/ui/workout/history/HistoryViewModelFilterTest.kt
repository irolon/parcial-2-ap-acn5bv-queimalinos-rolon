package com.fittrainer.ui.workout.history

import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistoryMetaDto
import com.fittrainer.data.api.history.HistoryPageDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.workout.history.HistoryRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import java.time.Instant
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** Spinner que no espera los detalles, filtros y resumen semanal de Progreso (tarea 13). */
@OptIn(ExperimentalCoroutinesApi::class)
class HistoryViewModelFilterTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeSessionApi()
    private val workoutDao = FakeWorkoutDao()
    private val clock = StepClock(Instant.parse("2026-10-30T12:00:00Z"))
    private val session = FakeStudentSession()
    private val repo = HistoryRepository(api, FakeHistoryDao(), workoutDao) { session }
    private val vm by lazy {
        HistoryViewModel(repo, session, FakeConnectivityObserver(online = true), clock)
    }

    private fun summary(id: String, at: String, comment: String? = null) =
        HistorySummaryDto(id, at, sets = 1, volumeKg = 10.0, trainerComment = comment)

    private fun load(vararg s: HistorySummaryDto, totalPages: Int = 2) {
        api.historyPages = mapOf(1 to HistoryPageDto(s.toList(), HistoryMetaDto(s.size, 1, 20, totalPages)))
        api.details = s.associate { it.id to HistoryDetailDto(it.id, it.startedAt) }
    }

    private val inWeek = summary("sem", "2026-10-29T12:00:00Z")
    private val old = summary("vieja", "2026-10-10T12:00:00Z", comment = "Bien")

    @Test fun elSpinnerBajaAntesDeQueTerminenLosDetalles() = runTest {
        load(inWeek)
        val gate = CompletableDeferred<Unit>().also { api.detailGate = it }
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        assertFalse(vm.uiState.value.isRefreshing)
        assertTrue(vm.uiState.value.everLoaded)
        assertEquals(listOf("sem"), vm.uiState.value.items.map { it.id })
        assertEquals(listOf("sem"), api.detailCalls)
        assertTrue(vm.uiState.value.detailsLoading)
        vm.onLoadMore() // el job de los detalles sigue activo: no se pisa
        advanceUntilIdle()
        assertEquals(listOf(1), api.historyRequests)
        gate.complete(Unit)
        advanceUntilIdle()
        assertFalse(vm.uiState.value.detailsLoading)
        vm.onPullToRefresh()
        advanceUntilIdle()
        assertEquals(listOf(1, 1), api.historyRequests)
    }

    @Test fun siFallaUnDetalleDespuesDeLaListaAvisaElError() = runTest {
        load(inWeek)
        api.failDetails = setOf("sem")
        api.detailFailure = com.fittrainer.testing.fakes.sync.httpError(500)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.refreshFailed)
        assertTrue(vm.uiState.value.hasMore)
    }

    @Test fun laListaOkCuentaParaLaVentanaDeCincoMinutosAunqueFalleUnDetalle() = runTest {
        load(inWeek)
        api.failDetails = setOf("sem")
        api.detailFailure = com.fittrainer.testing.fakes.sync.httpError(500)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        vm.onStart()
        advanceUntilIdle()
        assertEquals(listOf(1), api.historyRequests)
    }

    @Test fun porDefectoMuestraEstaSemanaConSuResumen() = runTest {
        load(inWeek, old)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        val state = vm.uiState.value
        assertEquals(HistoryFilter.WEEK, state.filter)
        assertEquals(listOf("sem"), state.visibleItems.map { it.id })
        assertEquals("Esta semana: 1 entrenamiento · 10 kg", state.weekSummary)
    }

    @Test fun cambiarDeFiltroAplicaSobreLoGuardado() = runTest {
        load(inWeek, old)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        vm.onFilterSelected(HistoryFilter.ALL)
        assertEquals(listOf("sem", "vieja"), vm.uiState.value.visibleItems.map { it.id })
        vm.onFilterSelected(HistoryFilter.COMMENTED)
        assertEquals(listOf("vieja"), vm.uiState.value.visibleItems.map { it.id })
        vm.onFilterSelected(HistoryFilter.RECORDS)
        assertTrue(vm.uiState.value.visibleItems.isEmpty())
    }

    @Test fun sinSubirApareceSoloSiHayYSiDesapareceVuelveAEstaSemana() = runTest {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        advanceUntilIdle()
        assertFalse(vm.uiState.value.hasPending)
        val at = Instant.parse("2026-10-29T12:00:00Z").toEpochMilli()
        val pending = finishedSession(startedAt = at)
        workoutDao.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to pending))
        advanceUntilIdle()
        assertTrue(vm.uiState.value.hasPending)
        vm.onFilterSelected(HistoryFilter.PENDING)
        assertEquals(listOf("w1"), vm.uiState.value.visibleItems.map { it.id })
        workoutDao.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to pending.copy(syncState = SYNC_SYNCED)))
        advanceUntilIdle()
        assertFalse(vm.uiState.value.hasPending)
        assertEquals(HistoryFilter.WEEK, vm.uiState.value.filter)
    }

    @Test fun unreadCommentsCuentaSoloLosSinLeerDeTodaLaListaSinImportarElFiltro() = runTest {
        val otra = summary("otra", "2026-10-29T13:00:00Z", comment = "Dale")
        load(inWeek, old, otra)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        assertEquals(HistoryFilter.WEEK, vm.uiState.value.filter) // "vieja" no se ve en este filtro y cuenta igual
        assertEquals(2, vm.uiState.value.unreadComments)
        repo.markCommentSeen("u1", "otra", "Dale")
        advanceUntilIdle()
        assertEquals(1, vm.uiState.value.unreadComments)
    }
}
