package com.fittrainer.data.chat

import com.fittrainer.data.api.chat.AiChatSuggestionDto
import com.fittrainer.data.api.chat.AiChatTodayDto
import com.fittrainer.testing.fakes.chat.FakeAiChatApi
import com.fittrainer.testing.fakes.chat.FakeAiChatDao
import com.fittrainer.testing.fakes.chat.replyDto
import com.fittrainer.testing.fakes.chat.todayMessage
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import java.io.IOException
import com.fittrainer.data.db.chat.AiChatMessageEntity
import java.time.Instant
import java.time.LocalDate
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Tarjeta 14. Hoy es el lunes 09/11, 12:00 de Argentina (15:00 UTC). */
@OptIn(ExperimentalCoroutinesApi::class)
class AiChatRepositoryTest {
    private val api = FakeAiChatApi()
    private val dao = FakeAiChatDao()
    private val clock = MutableClock(Instant.parse("2026-11-09T15:00:00Z").toEpochMilli())
    private val repo = AiChatRepository(api, dao, clock)
    private val press = AiChatSuggestionDto("e2", "Press", "Mismo músculo")
    private val sessionFinished = """{"error":{"code":"SESSION_FINISHED","message":"x"}}"""

    private suspend fun today() = repo.observeToday("u1").first().messages
    private fun error(e: Result<*>) = (e.exceptionOrNull() as AiChatException).error

    @Test fun `enviar guarda pregunta y respuesta con sus sugerencias`() = runTest {
        api.reply = replyDto("r1", "Probá press", 18, press)
        assertEquals(18, repo.send("u1", "¿Con qué lo reemplazo?", "s1", "e1").getOrThrow().remaining)
        assertEquals("s1", api.sent.single().sessionId)
        assertEquals("e1", api.sent.single().currentExerciseId)
        val msgs = today()
        assertEquals(listOf(true, false), msgs.map { it.fromUser })
        assertEquals("r1", msgs[1].id)
        assertEquals(listOf(AiChatSuggestion("e2", "Press", "Mismo músculo")), msgs[1].suggestions)
    }

    @Test fun `el par se ve pregunta primero aunque tengan el mismo instante`() = runTest {
        api.today = AiChatTodayDto(
            listOf(
                todayMessage("z-resp", "assistant", "Respuesta", "2026-11-09T14:00:00Z"),
                todayMessage("a-preg", "user", "Pregunta", "2026-11-09T14:00:00Z"),
            ),
            19,
        )
        repo.refresh("u1").getOrThrow()
        assertEquals(listOf("Pregunta", "Respuesta"), today().map { it.content })
    }

    @Test fun `un fallo no guarda nada`() = runTest {
        api.errors += IOException()
        assertEquals(AiChatError.Offline, error(repo.send("u1", "hola", null, null)))
        assertEquals(emptyList<AiChatMessage>(), today())
    }

    @Test fun `SESSION_FINISHED reintenta una sola vez sin session_id`() = runTest {
        api.errors += httpError(400, sessionFinished)
        assertTrue(repo.send("u1", "hola", "s1", "e1").isSuccess)
        assertEquals(listOf("s1", null), api.sent.map { it.sessionId })
        assertEquals(listOf("e1", "e1"), api.sent.map { it.currentExerciseId })
    }

    @Test fun `SESSION_FINISHED dos veces no reintenta de nuevo`() = runTest {
        repeat(2) { api.errors += httpError(400, sessionFinished) }
        assertEquals(AiChatError.Unknown, error(repo.send("u1", "hola", "s1", null)))
        assertEquals(2, api.sent.size)
    }

    @Test fun `el tope del dia llega tipado`() = runTest {
        api.errors += httpError(429, """{"error":{"code":"CHAT_LIMIT_REACHED","message":"x"}}""")
        assertEquals(AiChatError.DailyLimit, error(repo.send("u1", "hola", null, null)))
    }

    @Test fun `refresh reemplaza el dia, conserva sugerencias por id y devuelve lo que queda`() = runTest {
        api.reply = replyDto("r1", "Probá press", 19, press)
        repo.send("u1", "hola", null, null)
        api.today = AiChatTodayDto(
            listOf(
                todayMessage("q1", "user", "hola", "2026-11-09T15:00:00Z"),
                todayMessage("r1", "assistant", "Probá press", "2026-11-09T15:00:00Z"),
            ),
            19,
        )
        assertEquals(19, repo.refresh("u1").getOrThrow().remaining)
        val msgs = today()
        assertEquals(listOf("q1", "r1"), msgs.map { it.id })
        assertEquals("Press", msgs[1].suggestions.single().name)
    }

    @Test fun `refresh acepta created_at con offset`() = runTest {
        api.today = AiChatTodayDto(listOf(todayMessage("q1", "user", "hola", "2026-11-09T15:00:00.123+00:00")), 19)
        repo.refresh("u1").getOrThrow()
        assertEquals(Instant.parse("2026-11-09T15:00:00.123Z"), today().single().createdAt)
    }

    @Test fun `lo de ayer no se ve`() = runTest {
        api.today = AiChatTodayDto(listOf(todayMessage("viejo", "user", "ayer", "2026-11-09T02:00:00Z")), 20)
        repo.refresh("u1").getOrThrow()
        assertEquals(emptyList<AiChatMessage>(), today())
    }

    @Test fun `un refresh que falla deja Room como estaba`() = runTest {
        repo.send("u1", "hola", null, null)
        api.todayError = IOException()
        assertEquals(AiChatError.Offline, error(repo.refresh("u1")))
        assertEquals(2, today().size)
    }

    @Test fun `una respuesta que llega despues del logout no se guarda`() = runTest {
        val gate = CompletableDeferred<Unit>()
        api.gate = gate
        val pending = async { repo.send("u1", "hola", null, null) }
        runCurrent()
        repo.clearUserData("u1")
        gate.complete(Unit)
        assertTrue(pending.await().isFailure)
        assertEquals(emptyList<AiChatMessage>(), today())
    }

    @Test fun `una respuesta que llega pasada la medianoche queda en el dia de la pregunta`() = runTest {
        clock.millis = Instant.parse("2026-11-10T02:59:55Z").toEpochMilli() // 23:59:55 de Argentina
        val gate = CompletableDeferred<Unit>()
        api.gate = gate
        val pending = async { repo.send("u1", "hola", null, null) }
        runCurrent()
        clock.millis = Instant.parse("2026-11-10T03:00:06Z").toEpochMilli() // 00:00:06 del día siguiente
        gate.complete(Unit)
        pending.await().getOrThrow()
        clock.millis = Instant.parse("2026-11-10T02:59:59Z").toEpochMilli()
        assertEquals(2, today().size)
    }

    @Test fun `un refresh que sale antes de un envio y llega despues no lo borra`() = runTest {
        val gate = CompletableDeferred<Unit>()
        api.todayGate = gate
        api.reply = replyDto("r1", "Probá press", 18, press)
        val stale = async { repo.refresh("u1") }
        runCurrent()
        repo.send("u1", "hola", null, null).getOrThrow()
        gate.complete(Unit)
        assertTrue(stale.await().isFailure)
        val msgs = today()
        assertEquals(listOf("hola", "Probá press"), msgs.map { it.content })
        assertEquals("Press", msgs[1].suggestions.single().name)
    }

    @Test fun `el mismo observador pasa al dia nuevo a la medianoche`() = runTest {
        clock.millis = Instant.parse("2026-11-10T02:59:50Z").toEpochMilli() // 23:59:50 de Argentina
        var seen: AiChatToday? = null
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { repo.observeToday("u1").collect { seen = it } }
        dao.insert(listOf(AiChatMessageEntity("u1", "n1", "user", "nuevo", Instant.parse("2026-11-10T03:00:05Z").toEpochMilli(), null)))
        assertEquals(LocalDate.parse("2026-11-09"), seen!!.day)
        assertEquals(emptyList<AiChatMessage>(), seen!!.messages)
        clock.millis = Instant.parse("2026-11-10T03:00:05Z").toEpochMilli()
        advanceTimeBy(11_000)
        runCurrent()
        assertEquals(LocalDate.parse("2026-11-10"), seen!!.day)
        assertEquals(listOf("nuevo"), seen!!.messages.map { it.content })
    }

    @Test fun `cerrar sesion borra solo al duenio`() = runTest {
        repo.send("u1", "hola", null, null)
        repo.send("u2", "hola", null, null)
        repo.clearUserData("u1")
        assertEquals(emptyList<AiChatMessage>(), today())
        assertEquals(2, repo.observeToday("u2").first().messages.size)
        assertNull(dao.rows.value.firstOrNull { it.ownerId == "u1" })
    }
}
