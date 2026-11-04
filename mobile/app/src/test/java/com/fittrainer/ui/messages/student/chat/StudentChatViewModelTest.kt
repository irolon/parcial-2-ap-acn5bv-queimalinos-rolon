package com.fittrainer.ui.messages.student.chat

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.messages.photo.PhotoReader
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.session.Role
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesApi
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesDao
import com.fittrainer.testing.fakes.messages.messageDto
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.ui.messages.student.PHOTO_READ_FAILED
import com.fittrainer.ui.messages.student.PHOTO_REJECTED
import com.fittrainer.ui.messages.student.STUDENT_INACTIVE
import com.fittrainer.ui.messages.trainer.SEND_FAILED
import com.fittrainer.ui.messages.trainer.chat.CHAT_POLL_MS
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** Tarjeta 18: el chat del alumno con su PT (el alumno es s1, dueño del caché y de la conversación). */
@OptIn(ExperimentalCoroutinesApi::class)
class StudentChatViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerMessagesApi().apply {
        sender = "student"
        pages = mapOf(null to page(messageDto("m1", 1, fromTrainer = true), messageDto("m2", 2), name = "Profe Card"))
    }
    private val connectivity = FakeConnectivityObserver()
    private val repo = TrainerMessagesRepository(api, FakeTrainerMessagesDao(), Clock.fixed(Instant.parse("2026-11-01T13:00:00Z"), ZoneOffset.UTC))
    private var jpeg: ByteArray? = byteArrayOf(9)
    private val readUris = mutableListOf<String>()
    private val photos = PhotoReader { uri -> readUris += uri; jpeg }
    private val session = FakeStudentSession(AuthUser("s1", "Alumna Card", "alumna@test.com", Role.STUDENT))
    private val saved = SavedStateHandle()
    private val vm by lazy { StudentChatViewModel(repo, photos, session, connectivity, saved) }

    /** Abre el chat y corre el bloque; el polling se corta siempre, si no un assert fallido deja runTest girando. */
    private fun chatTest(setup: () -> Unit = {}, block: suspend TestScope.() -> Unit) = runTest {
        setup()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onForeground()
        runCurrent()
        try {
            block()
        } finally {
            vm.onBackground()
        }
    }

    @Test fun alAbrirMuestraElChatConElPtYMarcaLeidoLoSuyo() = chatTest {
        val state = vm.uiState.value
        assertEquals("Profe Card", state.trainerName)
        assertEquals(listOf("m1", "m2"), state.messages.map { it.id })
        assertEquals(listOf("s1"), api.reads)
    }

    @Test fun cadaCuatroSegundosVuelveAPedirYSoloMarcaLeidoSiElPtMandoAlgo() = chatTest(setup = { api.pages = mapOf(null to api.page(messageDto("m2", 2))) }) {
        assertTrue(api.reads.isEmpty())
        api.pages = mapOf(null to api.page(messageDto("m2", 2), messageDto("m3", 3, fromTrainer = true)))
        advanceTimeBy(CHAT_POLL_MS)
        runCurrent()
        assertEquals(2, api.historyCalls.size)
        assertEquals(listOf("s1"), api.reads)
    }

    @Test fun mandaTextoYVaciaLaCaja() = chatTest {
        vm.onDraft("Hola profe")
        vm.onSend()
        runCurrent()
        assertEquals(listOf("s1" to "Hola profe"), api.sent)
        assertEquals("", vm.draft)
        assertFalse(vm.uiState.value.messages.last().fromTrainer)
    }

    @Test fun conFotoAlcanzaSinTextoYElTextoVaDeEpigrafe() = chatTest {
        vm.onPhotoPicked("content://foto/1")
        assertTrue(vm.uiState.value.canSend(""))
        vm.onDraft("Así quedó")
        vm.onSend()
        runCurrent()
        assertEquals(listOf("content://foto/1"), readUris)
        assertEquals("Así quedó", api.photos.single().third)
        assertNull(vm.uiState.value.photo)
        assertEquals("", vm.draft)
    }

    @Test fun sacarLaFotoVuelveAlTexto() = chatTest {
        vm.onPhotoPicked("content://foto/1")
        vm.onRemovePhoto()
        assertFalse(vm.uiState.value.canSend(""))
    }

    @Test fun siNoSePuedeLeerLaFotoAvisaYNoManda() = chatTest(setup = { jpeg = null }) {
        vm.onPhotoPicked("content://foto/rota")
        vm.onSend()
        runCurrent()
        assertTrue(api.photos.isEmpty())
        assertEquals(PHOTO_READ_FAILED, vm.uiState.value.notice)
        assertNull(vm.uiState.value.photo)
    }

    @Test fun unaFotoRechazadaAvisaYSeSaca() = chatTest {
        api.sendError = apiError(413, "IMAGE_TOO_LARGE")
        vm.onPhotoPicked("content://foto/1")
        vm.onSend()
        runCurrent()
        assertEquals(PHOTO_REJECTED, vm.uiState.value.notice)
        assertNull(vm.uiState.value.photo)
    }

    @Test fun siFallaLaRedQuedanElTextoYLaFoto() = chatTest {
        api.sendError = IOException()
        vm.onPhotoPicked("content://foto/1")
        vm.onDraft("Mirá")
        vm.onSend()
        runCurrent()
        assertEquals(SEND_FAILED, vm.uiState.value.notice)
        assertEquals("content://foto/1", vm.uiState.value.photo)
        assertEquals("Mirá", vm.draft)
    }

    @Test fun conLaCuentaDadaDeBajaSeDeshabilitaLaCaja() = chatTest {
        api.sendError = apiError(409, "STUDENT_INACTIVE")
        vm.onDraft("Hola")
        vm.onSend()
        runCurrent()
        assertTrue(vm.uiState.value.inactive)
        assertEquals(STUDENT_INACTIVE, vm.uiState.value.notice)
        assertFalse(vm.uiState.value.canSend("Hola"))
    }

    @Test fun sinRedNoSePuedeMandar() = chatTest {
        connectivity.state.value = false
        runCurrent()
        vm.onDraft("Hola")
        assertFalse(vm.uiState.value.canSend(vm.draft))
        vm.onSend()
        runCurrent()
        assertTrue(api.sent.isEmpty())
    }
}
