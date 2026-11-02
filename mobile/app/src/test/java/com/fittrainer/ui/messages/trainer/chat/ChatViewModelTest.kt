package com.fittrainer.ui.messages.trainer.chat

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesApi
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesDao
import com.fittrainer.testing.fakes.messages.messageDto
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.ui.messages.trainer.SEND_FAILED
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ChatViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerMessagesApi()
    private val connectivity = FakeConnectivityObserver()
    private val repo = TrainerMessagesRepository(api, FakeTrainerMessagesDao(), Clock.fixed(Instant.parse("2026-11-01T13:00:00Z"), ZoneOffset.UTC))
    private val vm by lazy { ChatViewModel(repo, FakeTrainerSession(), connectivity, SavedStateHandle(mapOf(CHAT_STUDENT_ARG to "s1"))) }

    /** Abre el chat y corre el primer refresco (el polling queda andando hasta onBackground). */
    private fun TestScope.opened() {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onForeground()
        runCurrent()
    }

    @Test fun alAbrirMuestraElChatYMarcaLeidoLoDelAlumno() = runTest {
        opened()
        assertEquals("Ana", vm.uiState.value.name)
        assertEquals(listOf("m1", "m2"), vm.uiState.value.messages.map { it.id })
        assertEquals(listOf("s1"), api.reads)
        vm.onBackground()
    }

    @Test fun cadaCuatroSegundosVuelveAPedirYSoloMarcaLeidoSiHayNuevos() = runTest {
        api.pages = mapOf(null to api.page(messageDto("m1", 1, read = true)))
        opened()
        assertEquals(1, api.historyCalls.size)
        assertTrue(api.reads.isEmpty())
        api.pages = mapOf(null to api.page(messageDto("m1", 1, read = true), messageDto("m3", 3)))
        advanceTimeBy(CHAT_POLL_MS)
        runCurrent()
        assertEquals(2, api.historyCalls.size)
        assertEquals(listOf("m1", "m3"), vm.uiState.value.messages.map { it.id })
        assertEquals(listOf("s1"), api.reads)
        vm.onBackground()
        advanceTimeBy(CHAT_POLL_MS * 3)
        runCurrent()
        assertEquals(2, api.historyCalls.size)
    }

    @Test fun enviarVaciaLaCajaYMuestraElMensaje() = runTest {
        opened()
        vm.onDraft("Mantené 70 kg")
        vm.onSend()
        runCurrent()
        assertEquals(listOf("s1" to "Mantené 70 kg"), api.sent)
        assertEquals("", vm.draft)
        assertEquals("Mantené 70 kg", vm.uiState.value.messages.last().body)
        vm.onBackground()
    }

    @Test fun sinRedElTextoQuedaEnLaCaja() = runTest {
        opened()
        vm.onDraft("Hola")
        api.sendError = IOException("sin red")
        vm.onSend()
        runCurrent()
        assertEquals("Hola", vm.draft)
        assertEquals(SEND_FAILED, vm.uiState.value.notice)
        vm.onBackground()
    }

    @Test fun conElAlumnoDadoDeBajaSeDeshabilitaLaCaja() = runTest {
        opened()
        vm.onDraft("Hola")
        api.sendError = apiError(409, "STUDENT_INACTIVE")
        vm.onSend()
        runCurrent()
        assertTrue(vm.uiState.value.inactive)
        assertFalse(vm.uiState.value.canSend(vm.draft))
        vm.onBackground()
    }

    @Test fun sinConexionNoSePuedeMandar() = runTest {
        opened()
        connectivity.state.value = false
        vm.onDraft("Hola")
        assertFalse(vm.uiState.value.canSend(vm.draft))
        vm.onBackground()
    }

    @Test fun unaConversacionAjenaVuelveAtras() = runTest {
        api.error = apiError(403, "FORBIDDEN")
        opened()
        assertTrue(vm.uiState.value.gone)
        vm.onBackground()
    }
}
