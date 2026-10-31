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
import java.time.Instant
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** "Ver más" con páginas reales de 20 (ronda 3 de la PR #40, hallazgos H3 y H4 de Codex). */
@OptIn(ExperimentalCoroutinesApi::class)
class HistoryViewModelPaginasTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeSessionApi()
    private val dao = FakeHistoryDao()
    private val session = FakeStudentSession()
    private val repository = HistoryRepository(api, dao, FakeWorkoutDao()) { session }
    private val vm by lazy {
        HistoryViewModel(repository, session, FakeConnectivityObserver(online = true), StepClock(Instant.parse("2026-10-30T12:00:00Z")))
    }

    /** s01 es la más nueva; una hora entre cada una. */
    private fun s(n: Int, comment: String? = null, sets: Int = 1) = HistorySummaryDto(
        "s%02d".format(n), Instant.parse("2026-10-30T11:00:00Z").minusSeconds(3600L * n).toString(),
        sets = sets, volumeKg = 10.0, trainerComment = comment,
    )

    /** El servidor pagina de a 20, como el backend. */
    private fun serve(sessions: List<HistorySummaryDto>) {
        val pages = sessions.chunked(20)
        api.historyPages = pages.withIndex().associate { (i, p) -> i + 1 to HistoryPageDto(p, HistoryMetaDto(sessions.size, i + 1, 20, pages.size)) }
        api.details = sessions.associate { it.id to HistoryDetailDto(it.id, it.startedAt) }
    }

    private fun TestScope.go(action: () -> Unit) {
        action()
        advanceUntilIdle()
    }

    private fun ids() = vm.uiState.value.items.map { it.id }
    private fun range(from: Int, to: Int) = (from..to).map { "s%02d".format(it) }

    private fun TestScope.start(sessions: List<HistorySummaryDto>) {
        serve(sessions)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        go { vm.onStart() }
    }

    @Test fun h3SeBorraUnaDeLasVeinteYVerMasNoSalteaNinguna() = runTest {
        start((1..60).map { s(it) })
        go { vm.onLoadMore() }
        assertEquals(range(1, 40), ids())
        serve((2..60).map { s(it) }) // se borró s01: todo se corre una posición
        go { vm.onPullToRefresh() }
        go { vm.onLoadMore() }
        assertEquals(range(2, 41), ids())
    }

    @Test fun h4UnComentarioNuevoEnUnaSesionDeVerMasAparece() = runTest {
        start((1..40).map { s(it) })
        go { vm.onLoadMore() }
        repository.loadDetail("u1", "s25"); repository.loadDetail("u1", "s26")
        serve((1..40).map { s(it, comment = "Bien".takeIf { _ -> it == 25 }, sets = if (it == 26) 2 else 1) })
        go { vm.onPullToRefresh() }
        assertTrue(vm.uiState.value.hasMore)
        go { vm.onLoadMore() }
        assertTrue(vm.uiState.value.items.first { it.id == "s25" }.commentUnread)
        assertTrue(dao.state.value.sessions.getValue("s25").detailLoaded) // solo cambió el comentario: el detalle sirve
        assertFalse(dao.state.value.sessions.getValue("s26").detailLoaded) // cambiaron las series: se rebaja al abrirla
        assertFalse(vm.uiState.value.hasMore)
    }

    @Test fun despuesDeUnRefrescoUnToqueSigueHastaLaPrimeraPaginaConAlgoNuevo() = runTest {
        start((1..60).map { s(it) })
        go { vm.onLoadMore() }
        go { vm.onPullToRefresh() }
        go { vm.onLoadMore() }
        assertEquals(listOf(1, 2, 1, 2, 3), api.historyRequests)
        assertEquals(range(1, 60), ids())
        assertFalse(vm.uiState.value.hasMore)
    }

    @Test fun despuesDeUnRefrescoVerMasSeVeAunqueTodoEsteGuardado() = runTest {
        start((1..40).map { s(it) })
        go { vm.onLoadMore() }
        assertFalse(vm.uiState.value.hasMore)
        go { vm.onPullToRefresh() }
        assertTrue(vm.uiState.value.hasMore)
    }
}
