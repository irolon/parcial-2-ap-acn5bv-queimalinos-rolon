package com.fittrainer.ui.workout.aichat

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.api.LibraryResponse
import com.fittrainer.data.chat.AiChatMessage
import com.fittrainer.data.chat.AiChatRepository
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.chat.FakeAiChatApi
import com.fittrainer.testing.fakes.chat.FakeAiChatDao
import com.fittrainer.testing.fakes.library.FakeExerciseApi
import com.fittrainer.testing.fakes.library.FakeLibraryDao
import com.fittrainer.testing.fakes.library.libraryDto
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import java.time.Instant
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/**
 * Revisión de Pablo en la #96: una sugerencia pedida en el ejercicio A no reemplaza el B. «Reemplazar» solo vale para
 * la respuesta que se pidió en esta sesión y en el ejercicio que el alumno tiene ahora.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AiChatSuggestionTargetTest {
    @get:Rule val main = MainDispatcherRule()

    private fun answer(session: String?, exercise: String?) =
        AiChatMessage("r1", false, "Probá press", Instant.EPOCH, emptyList(), session, exercise)

    private val sentadilla = AiChatTarget("s1", "e1", "Sentadilla")
    private val pressBanca = AiChatTarget("s1", "e3", "Press banca")

    @Test fun `solo es accionable en la misma sesion y el mismo ejercicio`() {
        assertTrue(answer("s1", "e1").canReplaceFor(sentadilla))
        assertFalse(answer("s1", "e1").canReplaceFor(pressBanca))
        assertFalse(answer("s0", "e1").canReplaceFor(sentadilla))
        assertFalse(answer(null, "e1").canReplaceFor(sentadilla))
        assertFalse(answer("s1", null).canReplaceFor(sentadilla))
        assertFalse(answer(null, null).canReplaceFor(AiChatTarget(null, null, "Libre")))
    }

    private val exerciseApi = FakeExerciseApi(LibraryResponse(listOf(libraryDto("e2"))))
    private val clock = MutableClock(Instant.parse("2026-11-09T15:00:00Z").toEpochMilli())
    private val vm by lazy {
        AiChatViewModel(
            AiChatRepository(FakeAiChatApi(), FakeAiChatDao(), clock),
            LibraryRepository(exerciseApi, FakeLibraryDao(), clock),
            FakeStudentSession(), FakeConnectivityObserver(), SavedStateHandle(),
        )
    }

    @Test fun `una sugerencia pedida en sentadilla no reemplaza press banca`() = runTest {
        var resolved: LibraryExercise? = null
        vm.onReplaceSuggestion(answer("s1", "e1"), "e2", { pressBanca }) { resolved = it }
        runCurrent()
        assertNull(resolved)
        assertEquals(0, exerciseApi.calls)

        vm.onReplaceSuggestion(answer("s1", "e1"), "e2", { sentadilla }) { resolved = it }
        runCurrent()
        assertEquals("e2", resolved?.id)
    }

    /** Ronda 1 de Codex: el alumno pasa a Press banca mientras se refresca la biblioteca (p. ej. después de rotar). */
    @Test fun `si el ejercicio cambia mientras se busca la sugerencia no reemplaza`() = runTest {
        val gate = CompletableDeferred<Unit>()
        exerciseApi.gate = gate
        var current = sentadilla
        var resolved: LibraryExercise? = null
        vm.onReplaceSuggestion(answer("s1", "e1"), "e2", { current }) { resolved = it }
        runCurrent()
        current = pressBanca
        gate.complete(Unit)
        runCurrent()
        assertNull(resolved)
    }
}
