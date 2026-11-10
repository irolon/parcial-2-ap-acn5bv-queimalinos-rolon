package com.fittrainer.data.chat

import com.fittrainer.data.api.chat.AiChatSuggestionDto
import com.fittrainer.data.api.chat.AiChatTodayDto
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.chat.FakeAiChatApi
import com.fittrainer.testing.fakes.chat.FakeAiChatDao
import com.fittrainer.testing.fakes.chat.replyDto
import com.fittrainer.testing.fakes.chat.todayMessage
import java.time.Instant
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Revisión de Pablo en la #96: cada respuesta guarda la sesión y el ejercicio con que se preguntó, para que una
 * sugerencia vieja no reemplace el ejercicio que el alumno tenga después. Hoy es el 09/11, 12:00 de Argentina.
 */
class AiChatAskedContextTest {
    private val api = FakeAiChatApi()
    private val repo = AiChatRepository(api, FakeAiChatDao(), MutableClock(Instant.parse("2026-11-09T15:00:00Z").toEpochMilli()))
    private val press = AiChatSuggestionDto("e2", "Press", "Mismo músculo")

    private suspend fun answer() = repo.observeToday("u1").first().messages.single { !it.fromUser }

    @Test fun `la respuesta guarda la sesion y el ejercicio de la pregunta`() = runTest {
        api.reply = replyDto("r1", "Probá press", 18, press)
        repo.send("u1", "¿Con qué lo reemplazo?", "s1", "e1").getOrThrow()
        assertEquals("s1", answer().askedSessionId)
        assertEquals("e1", answer().askedExerciseId)
    }

    @Test fun `si se reintento sin sesion la respuesta no queda atada a una`() = runTest {
        api.errors += httpError(400, """{"error":{"code":"SESSION_FINISHED","message":"x"}}""")
        api.reply = replyDto("r1", "Probá press", 18, press)
        repo.send("u1", "hola", "s1", "e1").getOrThrow()
        assertNull(answer().askedSessionId)
        assertEquals("e1", answer().askedExerciseId)
    }

    @Test fun `el refresh conserva por id con que se pregunto`() = runTest {
        api.reply = replyDto("r1", "Probá press", 18, press)
        repo.send("u1", "hola", "s1", "e1").getOrThrow()
        api.today = AiChatTodayDto(
            listOf(
                todayMessage("q1", "user", "hola", "2026-11-09T15:00:00Z"),
                todayMessage("r1", "assistant", "Probá press", "2026-11-09T15:00:00Z"),
            ),
            18,
        )
        repo.refresh("u1").getOrThrow()
        assertEquals("s1", answer().askedSessionId)
        assertEquals("e1", answer().askedExerciseId)
    }

    @Test fun `una respuesta que solo conoce el servidor no queda atada a nada`() = runTest {
        api.today = AiChatTodayDto(listOf(todayMessage("r9", "assistant", "Hola", "2026-11-09T14:00:00Z")), 19)
        repo.refresh("u1").getOrThrow()
        assertNull(answer().askedSessionId)
        assertNull(answer().askedExerciseId)
    }
}
