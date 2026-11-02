package com.fittrainer.ui.students.sessions.detail

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.students.sessions.StudentSessionsRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.FakeTrainerSessionsDao
import com.fittrainer.testing.fakes.students.sessionDetail
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import com.fittrainer.ui.students.sessions.COMMENT_DELETED
import com.fittrainer.ui.students.sessions.COMMENT_FAILED
import com.fittrainer.ui.students.sessions.COMMENT_SAVED
import com.fittrainer.ui.students.sessions.DETAIL_REFRESH_FAILED
import com.fittrainer.ui.students.sessions.commentCounter
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class StudentSessionDetailViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeSessionApi().apply { details = mapOf("a1" to sessionDetail("a1")) }
    private val connectivity = FakeConnectivityObserver()
    private val repo = StudentSessionsRepository(api, FakeTrainerSessionsDao(), Clock.fixed(Instant.EPOCH, ZoneOffset.UTC))
    private val vm by lazy {
        StudentSessionDetailViewModel(
            repo, FakeTrainerSession(), connectivity, SavedStateHandle(mapOf(STUDENT_ID_ARG to "s", SESSION_ID_ARG to "a1")),
        )
    }

    private fun TestScope.started() {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
    }

    @Test fun `abre con el detalle y sin comentario no se puede guardar vacio ni borrar`() = runTest {
        started()
        assertTrue(vm.uiState.value.detail!!.detailLoaded)
        assertFalse(vm.uiState.value.canSave)
        assertFalse(vm.uiState.value.canDelete)
    }

    @Test fun `contador y mas de 1000 bloquea Guardar`() = runTest {
        started()
        vm.onDraft("a".repeat(1001))
        assertTrue(vm.uiState.value.tooLong)
        assertFalse(vm.uiState.value.canSave)
        assertEquals("1001/1000", commentCounter(vm.uiState.value.draft))
        vm.onDraft("a".repeat(1000))
        assertTrue(vm.uiState.value.canSave)
    }

    @Test fun `guardar y despues borrar`() = runTest {
        started()
        vm.onDraft("Buen ritmo, cuidá el descanso")
        vm.onSave()
        advanceUntilIdle()
        assertEquals(COMMENT_SAVED, vm.uiState.value.notice)
        assertEquals("Buen ritmo, cuidá el descanso", vm.uiState.value.detail!!.trainerComment)
        assertTrue(vm.uiState.value.canDelete)

        vm.onDelete()
        advanceUntilIdle()
        assertEquals("", api.comments.last().second.trainerComment.orEmpty())
        assertNull(vm.uiState.value.detail!!.trainerComment)
        assertEquals(COMMENT_DELETED, vm.uiState.value.notice)
    }

    @Test fun `sin red no se puede guardar`() = runTest {
        started()
        connectivity.state.value = false
        advanceUntilIdle()
        vm.onDraft("Hola")
        vm.onSave()
        advanceUntilIdle()
        assertTrue(api.comments.isEmpty())
    }

    @Test fun `error al guardar avisa y conserva el texto`() = runTest {
        started()
        api.commentError = IOException("corte")
        vm.onDraft("Hola")
        vm.onSave()
        advanceUntilIdle()
        assertEquals(COMMENT_FAILED, vm.uiState.value.notice)
        assertEquals("Hola", vm.uiState.value.draft)
    }

    @Test fun `lo escrito durante el envio no se pierde`() = runTest {
        started()
        api.commentGate = kotlinx.coroutines.CompletableDeferred()
        vm.onDraft("Primera versión")
        vm.onSave()
        advanceUntilIdle()
        vm.onDraft("Primera versión, y algo más")
        api.commentGate!!.complete(Unit)
        advanceUntilIdle()
        assertEquals("Primera versión", vm.uiState.value.detail!!.trainerComment)
        assertEquals("Primera versión, y algo más", vm.uiState.value.draft)
        assertTrue(vm.uiState.value.canSave)
    }

    @Test fun `404 al abrir el detalle es terminal`() = runTest {
        api.historyError = com.fittrainer.testing.fakes.sync.httpError(404)
        started()
        assertTrue(vm.uiState.value.gone)
        assertFalse(vm.uiState.value.canSave)
    }

    @Test fun `500 al abrir avisa y reintentar lo trae`() = runTest {
        api.historyError = com.fittrainer.testing.fakes.sync.httpError(500)
        started()
        assertEquals(DETAIL_REFRESH_FAILED, vm.uiState.value.loadError)
        api.historyError = null
        vm.onRetry()
        advanceUntilIdle()
        assertNull(vm.uiState.value.loadError)
        assertTrue(vm.uiState.value.detail!!.detailLoaded)
    }

    @Test fun `sin red al abrir no es un error`() = runTest {
        api.historyError = IOException("sin red")
        started()
        assertNull(vm.uiState.value.loadError)
        assertFalse(vm.uiState.value.gone)
    }
}
