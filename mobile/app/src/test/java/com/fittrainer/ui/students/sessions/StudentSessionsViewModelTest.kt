package com.fittrainer.ui.students.sessions

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.students.sessions.StudentSessionsRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.FakeTrainerSessionsDao
import com.fittrainer.testing.fakes.students.sessionPage
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
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

@OptIn(ExperimentalCoroutinesApi::class)
class StudentSessionsViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeSessionApi().apply {
        historyPages = mapOf(
            1 to sessionPage("a1", "a2", totalPages = 2),
            2 to sessionPage("a3", totalPages = 2, page = 2),
        )
    }
    private val repo = StudentSessionsRepository(api, FakeTrainerSessionsDao(), Clock.fixed(Instant.EPOCH, ZoneOffset.UTC))
    private val clock = MutableClock(0)
    private val vm by lazy {
        StudentSessionsViewModel(repo, FakeTrainerSession(), FakeConnectivityObserver(), SavedStateHandle(mapOf(STUDENT_ID_ARG to "s")), clock)
    }

    /** Vuelve a la pantalla pasado el tiempo de frescura (5 min). */
    private fun TestScope.restartedLater() {
        clock.millis += 6 * 60_000L
        vm.onStart()
        advanceUntilIdle()
    }

    private fun TestScope.started() {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
    }

    @Test fun `al entrar trae la pagina 1 y ofrece Ver mas`() = runTest {
        started()
        assertEquals(listOf("a1", "a2"), vm.uiState.value.items.map { it.id })
        assertTrue(vm.uiState.value.hasMore)
    }

    @Test fun `Ver mas suma la pagina 2 y no ofrece otra`() = runTest {
        started()
        vm.onLoadMore()
        advanceUntilIdle()
        assertEquals(listOf("a1", "a2", "a3"), vm.uiState.value.items.map { it.id })
        assertFalse(vm.uiState.value.hasMore)
    }

    @Test fun `Ver mas sin red avisa y no vacia la lista`() = runTest {
        started()
        api.historyError = IOException("sin red")
        vm.onLoadMore()
        advanceUntilIdle()
        assertEquals(LOAD_MORE_FAILED, vm.uiState.value.notice)
        assertEquals(listOf("a1", "a2"), vm.uiState.value.items.map { it.id })
        assertTrue(vm.uiState.value.hasMore)
    }

    @Test fun `volver sin red conserva las paginas ya traidas`() = runTest {
        started()
        vm.onLoadMore()
        advanceUntilIdle()
        api.historyError = IOException("sin red")
        vm.onRetry()
        advanceUntilIdle()
        assertEquals(listOf("a1", "a2", "a3"), vm.uiState.value.items.map { it.id })
    }

    @Test fun `500 sin cache avisa con reintentar y reintentar trae la lista`() = runTest {
        api.historyError = com.fittrainer.testing.fakes.sync.httpError(500)
        started()
        assertEquals(SESSIONS_REFRESH_FAILED, vm.uiState.value.loadError)
        assertTrue(vm.uiState.value.items.isEmpty())
        api.historyError = null
        vm.onRetry()
        advanceUntilIdle()
        assertEquals(null, vm.uiState.value.loadError)
        assertEquals(listOf("a1", "a2"), vm.uiState.value.items.map { it.id })
    }

    @Test fun `500 con cache avisa y conserva la lista`() = runTest {
        started()
        api.historyError = com.fittrainer.testing.fakes.sync.httpError(500)
        restartedLater()
        assertEquals(SESSIONS_REFRESH_FAILED, vm.uiState.value.loadError)
        assertEquals(listOf("a1", "a2"), vm.uiState.value.items.map { it.id })
    }

    @Test fun `volver de un detalle con la pagina 2 cargada no vuelve a bajar ni corta la lista`() = runTest {
        started()
        vm.onLoadMore()
        advanceUntilIdle()
        vm.onStart()
        advanceUntilIdle()
        restartedLater()
        assertEquals(listOf(1, 2), api.historyRequests)
        assertEquals(listOf("a1", "a2", "a3"), vm.uiState.value.items.map { it.id })
    }

    @Test fun `volver enseguida no vuelve a bajar y pasados 5 min si`() = runTest {
        started()
        vm.onStart()
        advanceUntilIdle()
        assertEquals(listOf(1), api.historyRequests)
        restartedLater()
        assertEquals(listOf(1, 1), api.historyRequests)
    }

    @Test fun `un refresh fallido no cuenta como fresco`() = runTest {
        api.historyError = IOException("sin red")
        started()
        api.historyError = null
        vm.onStart()
        advanceUntilIdle()
        assertEquals(listOf(1, 1), api.historyRequests)
    }

    @Test fun `sin red no es un error de carga`() = runTest {
        api.historyError = IOException("sin red")
        started()
        assertEquals(null, vm.uiState.value.loadError)
    }
}
