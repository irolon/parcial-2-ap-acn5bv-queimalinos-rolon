package com.fittrainer.data.messages.trainer

import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesApi
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesDao
import com.fittrainer.testing.fakes.messages.messageDto
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainerMessagesRepositoryTest {
    private val api = FakeTrainerMessagesApi()
    private val dao = FakeTrainerMessagesDao()
    private val repo = TrainerMessagesRepository(api, dao, Clock.fixed(Instant.parse("2026-11-01T13:00:00Z"), ZoneOffset.UTC))

    private suspend fun thread() = repo.observeThread("t1", "s1").first()!!

    @Test fun laListaSeGuardaEnElOrdenDelBackendYSumaLosNoLeidos() = runTest {
        assertNull(repo.observeConversations("t1").first())
        repo.refreshConversations("t1").getOrThrow()
        val list = repo.observeConversations("t1").first()!!.conversations
        assertEquals(listOf("Ana", "Beto"), list.map { it.name })
        assertNull(list[1].last)
        assertEquals(2, repo.observeUnread("t1").first())
    }

    @Test fun elChatSeGuardaEnOrdenYSabeSiHayMasViejos() = runTest {
        api.pages = mapOf(null to api.page(messageDto("m1", 1), messageDto("m2", 2, fromTrainer = true, read = true), nextBefore = "c1"))
        repo.refreshThread("t1", "s1").getOrThrow()
        val t = thread()
        assertEquals("Ana", t.name)
        assertEquals(listOf("m1", "m2"), t.messages.map { it.id })
        assertTrue(t.messages[1].fromTrainer && t.messages[1].read)
        assertTrue(t.hasMore)
    }

    @Test fun refrescarSinHuecoSumaYConservaElCursorDeLoMasViejo() = runTest {
        api.pages = mapOf(null to api.page(messageDto("m1", 1), messageDto("m2", 2), nextBefore = "c1"))
        repo.refreshThread("t1", "s1").getOrThrow()
        api.pages = mapOf(null to api.page(messageDto("m2", 2), messageDto("m3", 3), nextBefore = "c2"))
        repo.refreshThread("t1", "s1").getOrThrow()
        assertEquals(listOf("m1", "m2", "m3"), thread().messages.map { it.id })
        assertEquals("c1", dao.threads.value["t1" to "s1"]!!.nextBefore)
    }

    @Test fun conHuecoElChatSeReemplazaPorLaPaginaNueva() = runTest {
        api.pages = mapOf(null to api.page(messageDto("m1", 1), messageDto("m2", 2)))
        repo.refreshThread("t1", "s1").getOrThrow()
        api.pages = mapOf(null to api.page(messageDto("m10", 10), messageDto("m11", 11), nextBefore = "c9"))
        repo.refreshThread("t1", "s1").getOrThrow()
        assertEquals(listOf("m10", "m11"), thread().messages.map { it.id })
        assertEquals("c9", dao.threads.value["t1" to "s1"]!!.nextBefore)
    }

    @Test fun verAnterioresUsaElCursorYAlFinalNoHayMas() = runTest {
        api.pages = mapOf(
            null to api.page(messageDto("m5", 5), nextBefore = "c5"),
            "c5" to api.page(messageDto("m3", 3), messageDto("m4", 4)),
        )
        repo.refreshThread("t1", "s1").getOrThrow()
        repo.loadOlder("t1", "s1").getOrThrow()
        assertEquals(listOf(null, "c5"), api.historyCalls)
        assertEquals(listOf("m3", "m4", "m5"), thread().messages.map { it.id })
        assertFalse(thread().hasMore)
        repo.loadOlder("t1", "s1").getOrThrow()
        assertEquals(2, api.historyCalls.size)
    }

    @Test fun enviarGuardaElMensajeYActualizaLaVistaPrevia() = runTest {
        repo.refreshConversations("t1").getOrThrow()
        repo.refreshThread("t1", "s1").getOrThrow()
        repo.send("t1", "s1", "  Bien ahí  ").getOrThrow()
        assertEquals(listOf("s1" to "Bien ahí"), api.sent)
        assertEquals("Bien ahí", thread().messages.last().body)
        val ana = repo.observeConversations("t1").first()!!.conversations.first { it.studentId == "s1" }
        assertEquals("Bien ahí", ana.last!!.body)
        assertTrue(ana.last!!.fromTrainer)
    }

    @Test fun leerPoneEnCeroLosNoLeidosDeEsaConversacion() = runTest {
        repo.refreshConversations("t1").getOrThrow()
        repo.markRead("t1", "s1").getOrThrow()
        assertEquals(listOf("s1"), api.reads)
        assertEquals(0, repo.observeUnread("t1").first())
    }

    @Test fun laDifusionMandaUnSoloPostYDevuelveACuantos() = runTest {
        assertEquals(2, repo.broadcast("t1", listOf("s1", "s2"), " Feriado ").getOrThrow())
        assertEquals("Feriado", api.broadcasts.single().body)
    }
}
