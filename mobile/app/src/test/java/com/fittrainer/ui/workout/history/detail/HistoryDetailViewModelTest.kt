package com.fittrainer.ui.workout.history.detail

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.db.workout.history.HistorySessionEntity
import com.fittrainer.data.workout.history.HistoryOrigin
import com.fittrainer.data.workout.history.HistoryRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.httpError
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
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

@OptIn(ExperimentalCoroutinesApi::class)
class HistoryDetailViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeSessionApi()
    private val connectivity = FakeConnectivityObserver(online = true)
    private val historyDao = FakeHistoryDao()
    private val workoutDao = FakeWorkoutDao()

    private fun vm(id: String) = HistoryDetailViewModel(
        SavedStateHandle(mapOf("sessionId" to id)),
        HistoryRepository(api, historyDao, workoutDao) { FakeStudentSession() },
        FakeStudentSession(),
        connectivity,
    )

    private fun cached(id: String, detailLoaded: Boolean) = HistorySessionEntity(
        id, "u1", 1_760_695_200_000L, null, 54, "Push", null, null, null,
        hasModifications = false, sets = 1, volumeKg = 10.0, hasPr = false, inLatest = true, detailLoaded = detailLoaded,
    )

    private fun seed(id: String, detailLoaded: Boolean) {
        historyDao.state.value = FakeHistoryDao.State(sessions = mapOf(id to cached(id, detailLoaded)))
    }

    @Test fun conDetalleGuardadoNoLlamaALaApi() = runTest {
        seed("a", detailLoaded = true)
        val vm = vm("a")
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        advanceUntilIdle()
        assertTrue(vm.uiState.value.detail!!.detailLoaded)
        assertTrue(api.detailCalls.isEmpty())
    }

    @Test fun sinDetalleYConRedLoPideUnaVez() = runTest {
        seed("a", detailLoaded = false)
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"))
        val vm = vm("a")
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        advanceUntilIdle()
        assertEquals(listOf("a"), api.detailCalls)
        assertTrue(vm.uiState.value.detail!!.detailLoaded)
        assertFalse(vm.uiState.value.loading)
    }

    @Test fun sinDetalleYSinRedNoLlamaALaApi() = runTest {
        connectivity.state.value = false
        seed("a", detailLoaded = false)
        val vm = vm("a")
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        advanceUntilIdle()
        assertTrue(api.detailCalls.isEmpty())
        assertTrue(vm.uiState.value.isOffline)
        assertFalse(vm.uiState.value.detail!!.detailLoaded)
    }

    @Test fun sesionLocalSeMuestraSinLlamarALaApi() = runTest {
        workoutDao.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession("w1")))
        val vm = vm("w1")
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        advanceUntilIdle()
        assertEquals(HistoryOrigin.LOCAL_PENDING, vm.uiState.value.detail!!.item.origin)
        assertTrue(api.detailCalls.isEmpty())
    }

    @Test fun idInexistenteEsMissing() = runTest {
        val vm = vm("nope")
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        advanceUntilIdle()
        assertTrue(vm.uiState.value.missing)
        assertTrue(api.detailCalls.isEmpty())
    }

    @Test fun siElDetalleFallaMuestraErrorYReintentaConRetry() = runTest {
        seed("a", detailLoaded = false)
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"))
        api.failDetails = setOf("a")
        api.detailFailure = httpError(503)
        val vm = vm("a")
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        advanceUntilIdle()
        assertTrue(vm.uiState.value.error)
        assertFalse(vm.uiState.value.loading)
        assertEquals(listOf("a"), api.detailCalls)
        api.failDetails = emptySet()
        vm.retry()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.detail!!.detailLoaded)
        assertFalse(vm.uiState.value.error)
    }

    @Test fun abiertaSinRedPideUnaSolaVezAlVolverLaConexion() = runTest {
        connectivity.state.value = false
        seed("a", detailLoaded = false)
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"))
        val vm = vm("a")
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        advanceUntilIdle()
        assertTrue(api.detailCalls.isEmpty())
        connectivity.state.value = true
        advanceUntilIdle()
        assertEquals(listOf("a"), api.detailCalls)
        assertTrue(vm.uiState.value.detail!!.detailLoaded)
    }

    private fun withComment(comment: String) {
        historyDao.state.value = FakeHistoryDao.State(sessions = mapOf("a" to cached("a", true).copy(trainerComment = comment)))
    }

    @Test fun onCommentShownMarcaLeidoUnaSolaVezPorTexto() = runTest {
        withComment("Muy bien")
        val vm = vm("a")
        vm.onCommentShown("Muy bien")
        advanceUntilIdle()
        assertEquals(listOf("a" to "Muy bien"), historyDao.state.value.seen.map { it.sessionId to it.comment })
        historyDao.state.value = historyDao.state.value.copy(seen = emptyList())
        vm.onCommentShown("Muy bien")
        advanceUntilIdle()
        assertTrue(historyDao.state.value.seen.isEmpty())
        vm.onCommentShown("Cambié de idea")
        advanceUntilIdle()
        assertEquals("Cambié de idea", historyDao.state.value.seen.single().comment)
    }

    @Test fun siElComentarioCambiaSinPantallaVisibleNoSeMarcaLeido() = runTest {
        withComment("Muy bien")
        val vm = vm("a")
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        advanceUntilIdle()
        val st = historyDao.state.value
        historyDao.state.value = st.copy(sessions = mapOf("a" to cached("a", true).copy(trainerComment = "Cambié de idea")))
        advanceUntilIdle()
        assertEquals("Cambié de idea", vm.uiState.value.detail!!.trainerComment)
        assertTrue(historyDao.state.value.seen.isEmpty())
    }

    @Test fun sinComentarioNoMarcaNada() = runTest {
        seed("a", detailLoaded = true)
        val vm = vm("a")
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        advanceUntilIdle()
        assertTrue(historyDao.state.value.seen.isEmpty())
    }
}
