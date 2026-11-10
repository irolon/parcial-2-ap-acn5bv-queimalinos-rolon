package com.fittrainer.ui.workout.aichat

import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.chat.AiChatMessage
import com.fittrainer.data.chat.AiChatRepository
import com.fittrainer.data.api.LibraryResponse
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.chat.FakeAiChatApi
import com.fittrainer.testing.fakes.chat.FakeAiChatDao
import com.fittrainer.testing.fakes.chat.replyDto
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.library.FakeExerciseApi
import com.fittrainer.testing.fakes.library.FakeLibraryDao
import com.fittrainer.testing.fakes.library.libraryDto
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import java.io.IOException
import java.time.Instant
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** Tarjeta 14: el chat IA dentro de la sesión. El alumno es u1; hoy es el 09/11 a las 12:00 de Argentina. */
@OptIn(ExperimentalCoroutinesApi::class)
class AiChatViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    private val api = FakeAiChatApi()
    private val clock = MutableClock(Instant.parse("2026-11-09T15:00:00Z").toEpochMilli())
    private val repo = AiChatRepository(api, FakeAiChatDao(), clock)
    private val exerciseApi = FakeExerciseApi(LibraryResponse(listOf(libraryDto("e2"))))
    private val library = LibraryRepository(exerciseApi, FakeLibraryDao(), clock)
    private val connectivity = FakeConnectivityObserver()
    private val vm by lazy { AiChatViewModel(repo, library, FakeStudentSession(), connectivity, SavedStateHandle()) }
    private val target = AiChatTarget("s1", "e1", "Sentadilla")
    private val asked = AiChatMessage("r1", false, "Probá press", Instant.EPOCH, emptyList(), "s1", "e1")

    private fun chatTest(block: suspend TestScope.() -> Unit) = runTest {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        block()
    }

    @Test fun `un chip de pregunta se envia solo y la respuesta queda en la lista`() = chatTest {
        vm.onChip(CHIP_REPLACE, target)
        runCurrent()
        assertEquals(CHIP_REPLACE, api.sent.single().message)
        assertEquals(listOf(CHIP_REPLACE, "Probá press"), vm.uiState.value.messages.map { it.content })
        assertEquals(19, vm.uiState.value.remaining)
    }

    @Test fun `el chip del dolor completa la caja con el cursor en el hueco y no envia`() = chatTest {
        vm.onPainChip("Sentadilla")
        assertEquals("Me duele  al hacer Sentadilla", vm.draft.text)
        assertEquals(TextRange(PAIN_CURSOR), vm.draft.selection)
        assertTrue(api.sent.isEmpty())
    }

    @Test fun `enviar la caja la vacia si sale bien`() = chatTest {
        vm.onDraft(TextFieldValue("  ¿Cómo bajo?  "))
        vm.onSend(target)
        runCurrent()
        assertEquals("¿Cómo bajo?", api.sent.single().message)
        assertEquals("", vm.draft.text)
    }

    @Test fun `si falla el texto queda en la caja con el aviso`() = chatTest {
        api.errors += IOException()
        vm.onDraft(TextFieldValue("hola"))
        vm.onSend(target)
        runCurrent()
        assertEquals("hola", vm.draft.text)
        assertEquals(AI_OFFLINE, vm.uiState.value.banner)
        assertFalse(vm.uiState.value.sending)
    }

    @Test fun `un segundo envio mientras espera no sale`() = chatTest {
        val gate = CompletableDeferred<Unit>()
        api.gate = gate
        vm.onChip(CHIP_REPLACE, target)
        runCurrent()
        assertTrue(vm.uiState.value.sending)
        vm.onChip(CHIP_HOW_TO, target)
        vm.onDraft(TextFieldValue("otra"))
        vm.onSend(target)
        runCurrent()
        gate.complete(Unit)
        runCurrent()
        assertEquals(1, api.sent.size)
    }

    @Test fun `el tope del dia apaga la caja`() = chatTest {
        api.errors += httpError(429, """{"error":{"code":"CHAT_LIMIT_REACHED","message":"x"}}""")
        vm.onChip(CHIP_REPLACE, target)
        runCurrent()
        assertTrue(vm.uiState.value.limitReached)
        assertFalse(vm.uiState.value.canAsk)
        assertEquals(AI_DAILY_LIMIT, vm.uiState.value.banner)
    }

    @Test fun `responder con cero restantes tambien apaga la caja`() = chatTest {
        api.reply = replyDto(remaining = 0)
        vm.onChip(CHIP_REPLACE, target)
        runCurrent()
        assertTrue(vm.uiState.value.limitReached)
    }

    @Test fun `sin red no se puede preguntar y el aviso lo explica`() = chatTest {
        connectivity.state.value = false
        runCurrent()
        assertFalse(vm.uiState.value.canAsk)
        assertEquals(AI_OFFLINE, vm.uiState.value.banner)
        vm.onChip(CHIP_REPLACE, target)
        runCurrent()
        assertTrue(api.sent.isEmpty())
    }

    @Test fun `abrir refresca y trae lo que queda`() = chatTest {
        api.today = api.today.copy(remainingToday = 4)
        vm.onOpen()
        runCurrent()
        assertEquals(4, vm.uiState.value.remaining)
        assertEquals(remainingText(4), vm.uiState.value.remainingLabel)
    }

    @Test fun `dictar suma el texto a la caja`() = chatTest {
        vm.onDictated("me duele la rodilla")
        assertEquals("me duele la rodilla", vm.draft.text)
        vm.onDictated("al bajar")
        assertEquals("me duele la rodilla al bajar", vm.draft.text)
    }

    @Test fun `reemplazar una sugerencia que no esta en Room refresca la biblioteca una vez`() = chatTest {
        var resolved: LibraryExercise? = null
        vm.onReplaceSuggestion(asked, "e2", { target }) { resolved = it }
        runCurrent()
        assertEquals("e2", resolved?.id)
        assertEquals(1, exerciseApi.calls)
    }

    @Test fun `una sugerencia que no aparece ni refrescando avisa`() = chatTest {
        var resolved: LibraryExercise? = null
        vm.onReplaceSuggestion(asked, "nada", { target }) { resolved = it }
        runCurrent()
        assertNull(resolved)
        assertEquals(AI_SUGGESTION_MISSING, vm.uiState.value.banner)
    }

    @Test fun `cerrar la hoja mientras busca la sugerencia no reemplaza nada`() = chatTest {
        val gate = CompletableDeferred<Unit>()
        exerciseApi.gate = gate
        var resolved: LibraryExercise? = null
        vm.onReplaceSuggestion(asked, "e2", { target }) { resolved = it }
        runCurrent()
        vm.onClose()
        gate.complete(Unit)
        runCurrent()
        assertNull(resolved)
    }

    @Test fun `un segundo toque mientras busca la sugerencia no busca de nuevo`() = chatTest {
        val gate = CompletableDeferred<Unit>()
        exerciseApi.gate = gate
        var calls = 0
        vm.onReplaceSuggestion(asked, "e2", { target }) { calls++ }
        runCurrent()
        vm.onReplaceSuggestion(asked, "e2", { target }) { calls++ }
        gate.complete(Unit)
        runCurrent()
        assertEquals(1, calls)
        assertEquals(1, exerciseApi.calls)
    }

    @Test fun `la caja corta en 500`() = chatTest {
        vm.onDraft(TextFieldValue("x".repeat(600)))
        assertEquals(MAX_MESSAGE_LENGTH, vm.draft.text.length)
    }
}
