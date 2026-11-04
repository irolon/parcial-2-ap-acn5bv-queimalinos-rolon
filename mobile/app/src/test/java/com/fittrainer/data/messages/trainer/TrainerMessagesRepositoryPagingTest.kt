package com.fittrainer.data.messages.trainer

import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesApi
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesDao
import com.fittrainer.testing.fakes.messages.messageDto
import com.fittrainer.testing.fakes.routine.StepClock
import java.time.Duration
import java.time.Instant
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Ronda 1 de Codex (E11): el cursor de un chat que estaba vacío y las fotos de páginas viejas. */
class TrainerMessagesRepositoryPagingTest {
    private val api = FakeTrainerMessagesApi()
    private val clock = StepClock(Instant.parse("2026-11-01T13:00:00Z"))
    private val repo = TrainerMessagesRepository(api, FakeTrainerMessagesDao(), clock)

    private suspend fun thread() = repo.observeThread("t1", "s1").first()!!

    @Test fun unChatQueEstabaVacioGuardaElCursorCuandoLlegaUnaPaginaLlena() = runTest {
        api.pages = mapOf(null to api.page())
        repo.refreshThread("t1", "s1").getOrThrow()
        assertFalse(thread().hasMore)

        api.pages = mapOf(
            null to api.page(messageDto("m51", 51), nextBefore = "c51"),
            "c51" to api.page(messageDto("m1", 1)),
        )
        repo.refreshThread("t1", "s1").getOrThrow()
        assertTrue(thread().hasMore)
        repo.loadOlder("t1", "s1").getOrThrow()
        assertEquals(listOf("m1", "m51"), thread().messages.map { it.id })
    }

    @Test fun lasFotosDePaginasViejasSeRenuevanPasados50Minutos() = runTest {
        api.pages = mapOf(
            null to api.page(messageDto("m5", 5), nextBefore = "c5"),
            "c5" to api.page(messageDto("m1", 1, image = "url-vieja"), messageDto("m2", 2)),
        )
        repo.refreshThread("t1", "s1").getOrThrow()
        repo.loadOlder("t1", "s1").getOrThrow()

        // Antes de los 50 min no se re-pide nada.
        clock.now = clock.now.plus(Duration.ofMinutes(49))
        repo.refreshThread("t1", "s1").getOrThrow()
        assertEquals(listOf(null, "c5", null), api.historyCalls)

        // Después, se re-pide desde la foto vencida (+1 ms, porque before es exclusivo) y solo se guarda lo cargado.
        clock.now = clock.now.plus(Duration.ofMinutes(2))
        val renew = "2026-11-01T12:01:00.001Z"
        api.pages = api.pages + (renew to api.page(messageDto("m0", 0), messageDto("m1", 1, image = "url-nueva")))
        repo.refreshThread("t1", "s1").getOrThrow()
        assertEquals(renew, api.historyCalls.last())
        val msgs = thread().messages
        assertEquals("url-nueva", msgs.first { it.id == "m1" }.imageUrl)
        assertEquals(listOf("m1", "m2", "m5"), msgs.map { it.id })

        // Ya renovada, el próximo refresco no vuelve a pedirla.
        val calls = api.historyCalls.size
        repo.refreshThread("t1", "s1").getOrThrow()
        assertEquals(calls + 1, api.historyCalls.size)
    }
}
