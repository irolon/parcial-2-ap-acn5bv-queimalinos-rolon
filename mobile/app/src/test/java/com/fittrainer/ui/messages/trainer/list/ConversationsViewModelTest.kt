package com.fittrainer.ui.messages.trainer.list

import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesApi
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.ui.messages.trainer.BROADCAST_FAILED
import com.fittrainer.ui.messages.trainer.BROADCAST_STALE
import com.fittrainer.ui.messages.trainer.MESSAGES_REFRESH_FAILED
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
class ConversationsViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerMessagesApi()
    private val clock = Clock.fixed(Instant.parse("2026-11-01T13:00:00Z"), ZoneOffset.UTC)
    private val repo = TrainerMessagesRepository(api, FakeTrainerMessagesDao(), clock)
    private val vm by lazy { ConversationsViewModel(repo, FakeTrainerSession(), FakeConnectivityObserver(), clock) }

    private fun TestScope.started() {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
    }

    @Test fun alEntrarBajaLaLista() = runTest {
        started()
        val s = vm.uiState.value
        assertTrue(s.everSynced)
        assertEquals(listOf("Ana", "Beto"), s.conversations.map { it.name })
    }

    @Test fun sinListaYConErrorMuestraLaPantallaDeError() = runTest {
        api.error = apiError(500, "INTERNAL")
        started()
        assertTrue(vm.uiState.value.showErrorScreen)
        assertEquals(MESSAGES_REFRESH_FAILED, vm.uiState.value.error)
    }

    @Test fun laDifusionEligeATodosYMandaUnSoloPost() = runTest {
        started()
        vm.openBroadcast()
        vm.onToggleAll()
        vm.onBroadcastText("Mañana no hay clase")
        vm.onSendBroadcast()
        advanceUntilIdle()
        assertEquals(setOf("s1", "s2"), api.broadcasts.single().studentIds.toSet())
        assertNull(vm.uiState.value.broadcast)
        assertEquals("Enviado a 2 alumnos", vm.uiState.value.notice)
    }

    @Test fun todosDosVecesDesmarcaYSinTextoNoSePuedeMandar() = runTest {
        started()
        vm.openBroadcast()
        vm.onToggleAll()
        vm.onToggleAll()
        assertTrue(vm.uiState.value.broadcast!!.selected.isEmpty())
        vm.onToggle("s1")
        assertFalse(vm.uiState.value.broadcast!!.canSend(vm.broadcastText))
        vm.onSendBroadcast()
        advanceUntilIdle()
        assertTrue(api.broadcasts.isEmpty())
    }

    @Test fun siAlgunoYaNoEsActivoSeVaciaLaEleccionYSeRefrescaLaLista() = runTest {
        started()
        vm.openBroadcast()
        vm.onToggle("s1")
        vm.onBroadcastText("Hola")
        api.error = apiError(403, "FORBIDDEN")
        vm.onSendBroadcast()
        advanceUntilIdle()
        val b = vm.uiState.value.broadcast!!
        assertEquals(BROADCAST_STALE, b.error)
        assertTrue(b.selected.isEmpty())
        assertEquals("Hola", vm.broadcastText)
    }

    @Test fun sinRedLaHojaQuedaConloElegidoYElTexto() = runTest {
        started()
        vm.openBroadcast()
        vm.onToggle("s1")
        vm.onBroadcastText("Hola")
        api.error = IOException("sin red")
        vm.onSendBroadcast()
        advanceUntilIdle()
        val b = vm.uiState.value.broadcast!!
        assertEquals(BROADCAST_FAILED, b.error)
        assertEquals(setOf("s1"), b.selected)
        assertFalse(b.sending)
    }
}
