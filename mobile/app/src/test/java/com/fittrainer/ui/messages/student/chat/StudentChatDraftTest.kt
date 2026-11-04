package com.fittrainer.ui.messages.student.chat

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.messages.photo.PhotoReader
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.session.Role
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesApi
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

/** Ronda 1 de Codex (tarjeta 18): la foto de un envío lento y el borrador que sobrevive a la muerte del proceso. */
@OptIn(ExperimentalCoroutinesApi::class)
class StudentChatDraftTest {
    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerMessagesApi().apply { sender = "student" }
    private val connectivity = FakeConnectivityObserver()
    private val repo = TrainerMessagesRepository(api, FakeTrainerMessagesDao(), Clock.fixed(Instant.parse("2026-11-01T13:00:00Z"), ZoneOffset.UTC))
    private val photos = PhotoReader { byteArrayOf(9) }
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

    @Test fun unaFotoElegidaDuranteUnEnvioLentoNoSeBorraAlTerminar() = chatTest {
        val slow = CompletableDeferred<Unit>()
        api.sendGate = slow
        vm.onPhotoPicked("content://foto/1")
        vm.onSend()
        runCurrent()
        vm.onPhotoPicked("content://foto/2")
        slow.complete(Unit)
        runCurrent()
        assertEquals(1, api.photos.size)
        assertEquals("content://foto/2", vm.uiState.value.photo)
    }

    @Test fun elBorradorYLaFotoSobrevivenAQueAndroidMateElProceso() = chatTest {
        vm.onDraft("A medio escribir")
        vm.onPhotoPicked("content://foto/1")
        vm.onBackground()
        val again = StudentChatViewModel(repo, photos, session, connectivity, SavedStateHandle(saved.keys().associateWith { saved.get<Any>(it) }))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { again.uiState.collect {} }
        runCurrent()
        assertEquals("A medio escribir", again.draft)
        assertEquals("content://foto/1", again.uiState.value.photo)
    }
}
