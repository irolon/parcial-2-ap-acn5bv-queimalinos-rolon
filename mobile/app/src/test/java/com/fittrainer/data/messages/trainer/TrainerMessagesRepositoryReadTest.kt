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
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Ronda 1 de Codex (tarjeta 18): marcar leído también actualiza Room, incluidas las páginas viejas que el refresco de
 * la más nueva no vuelve a traer. Si no, el globito del alumno no bajaba y se volvía a pedir leído en cada refresco.
 */
class TrainerMessagesRepositoryReadTest {
    private val api = FakeTrainerMessagesApi()
    private val repo = TrainerMessagesRepository(api, FakeTrainerMessagesDao(), Clock.fixed(Instant.parse("2026-11-01T13:00:00Z"), ZoneOffset.UTC))

    private suspend fun messages(owner: String) = repo.observeThread(owner, "s1").first()!!.messages

    @Test fun elAlumnoMarcaLeidosLosDelPtDeTodasLasPaginasYNoLosSuyos() = runTest {
        api.pages = mapOf(
            null to api.page(messageDto("m5", 5, fromTrainer = true), messageDto("m6", 6), nextBefore = "c5"),
            "c5" to api.page(messageDto("m1", 1, fromTrainer = true), messageDto("m2", 2, fromTrainer = true)),
        )
        repo.refreshThread("s1", "s1").getOrThrow()
        repo.loadOlder("s1", "s1").getOrThrow()

        repo.markRead("s1", "s1").getOrThrow()

        val byId = messages("s1").associateBy { it.id }
        assertTrue(listOf("m1", "m2", "m5").all { byId.getValue(it).read })
        assertEquals(false, byId.getValue("m6").read)
        assertEquals(listOf("s1"), api.reads)
    }

    @Test fun elPtMarcaLeidosLosDelAlumno() = runTest {
        api.pages = mapOf(null to api.page(messageDto("m1", 1), messageDto("m2", 2, fromTrainer = true)))
        repo.refreshThread("t1", "s1").getOrThrow()

        repo.markRead("t1", "s1").getOrThrow()

        val byId = messages("t1").associateBy { it.id }
        assertTrue(byId.getValue("m1").read)
        assertEquals(false, byId.getValue("m2").read)
    }

    @Test fun siElServidorFallaNoSeMarcaNadaEnRoom() = runTest {
        api.pages = mapOf(null to api.page(messageDto("m1", 1, fromTrainer = true)))
        repo.refreshThread("s1", "s1").getOrThrow()
        api.error = java.io.IOException()

        assertTrue(repo.markRead("s1", "s1").isFailure)
        assertEquals(false, messages("s1").single().read)
    }
}
