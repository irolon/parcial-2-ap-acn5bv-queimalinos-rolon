package com.fittrainer.ui.workout.aichat

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.api.LibraryResponse
import com.fittrainer.data.chat.AiChatRepository
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.chat.FakeAiChatApi
import com.fittrainer.testing.fakes.chat.FakeAiChatDao
import com.fittrainer.testing.fakes.chat.replyDto
import com.fittrainer.testing.fakes.library.FakeExerciseApi
import com.fittrainer.testing.fakes.library.FakeLibraryDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import java.time.Instant
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
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

/** Tarjeta 14 (ronda 1 de Codex): con la hoja abierta a la medianoche de Argentina, el cupo de ayer no bloquea hoy. */
@OptIn(ExperimentalCoroutinesApi::class)
class AiChatViewModelDayTest {
    @get:Rule val main = MainDispatcherRule()

    private val api = FakeAiChatApi()
    private val clock = MutableClock(Instant.parse("2026-11-10T02:59:50Z").toEpochMilli()) // 23:59:50 de Argentina
    private val repo = AiChatRepository(api, FakeAiChatDao(), clock)
    private val library = LibraryRepository(FakeExerciseApi(LibraryResponse(emptyList())), FakeLibraryDao(), clock)
    private val vm by lazy { AiChatViewModel(repo, library, FakeStudentSession(), FakeConnectivityObserver(), SavedStateHandle()) }
    private val target = AiChatTarget("s1", "e1", "Sentadilla")

    @Test fun `el tope de ayer deja de bloquear al pasar la medianoche`() = runTest {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        api.reply = replyDto(remaining = 0)
        vm.onChip(CHIP_REPLACE, target)
        runCurrent()
        assertTrue(vm.uiState.value.limitReached)

        clock.millis = Instant.parse("2026-11-10T03:00:05Z").toEpochMilli()
        advanceTimeBy(11_000)
        runCurrent()
        assertFalse(vm.uiState.value.limitReached)
        assertNull(vm.uiState.value.remaining)
        assertTrue(vm.uiState.value.canAsk)
        assertEquals(emptyList<String>(), vm.uiState.value.messages.map { it.content })
    }

    @Test fun `un 429 de tope que llega pasada la medianoche no bloquea el dia nuevo`() = runTest {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        val gate = CompletableDeferred<Unit>()
        api.gate = gate
        api.errors += httpError(429, LIMIT)
        vm.onChip(CHIP_REPLACE, target)
        runCurrent()

        clock.millis = Instant.parse("2026-11-10T03:00:05Z").toEpochMilli()
        advanceTimeBy(11_000)
        gate.complete(Unit)
        runCurrent()
        assertFalse(vm.uiState.value.limitReached)
        assertTrue(vm.uiState.value.canAsk)
        assertNull(vm.uiState.value.banner)
    }

    @Test fun `el tope y su aviso de antes de la medianoche caducan con el dia`() = runTest {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        api.errors += httpError(429, LIMIT)
        vm.onChip(CHIP_REPLACE, target)
        runCurrent()
        assertTrue(vm.uiState.value.limitReached)
        assertEquals(AI_DAILY_LIMIT, vm.uiState.value.banner)

        clock.millis = Instant.parse("2026-11-10T03:00:05Z").toEpochMilli()
        advanceTimeBy(11_000)
        runCurrent()
        assertFalse(vm.uiState.value.limitReached)
        assertNull(vm.uiState.value.banner)
    }

    private companion object {
        const val LIMIT = """{"error":{"code":"CHAT_LIMIT_REACHED","message":"x"}}"""
    }
}
