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
import org.junit.Assert.assertNull
import org.junit.Test

/** Ronda 3 de Codex (E11): con la firma best-effort de la #47, una foto puede llegar con image_url null. */
class TrainerMessagesRepositorySigningTest {
    private val api = FakeTrainerMessagesApi()
    private val clock = StepClock(Instant.parse("2026-11-01T13:00:00Z"))
    private val repo = TrainerMessagesRepository(api, FakeTrainerMessagesDao(), clock)

    private suspend fun photo(id: String) = repo.observeThread("t1", "s1").first()!!.messages.first { it.id == id }

    @Test fun siFallaLaFirmaUnaFotoDePaginaViejaConservaSuUrlYSeRecuperaCuandoVuelveStorage() = runTest {
        api.pages = mapOf(
            null to api.page(messageDto("m5", 5), nextBefore = "c5"),
            "c5" to api.page(messageDto("m1", 1, image = "url-vieja", body = null)),
        )
        repo.refreshThread("t1", "s1").getOrThrow()
        repo.loadOlder("t1", "s1").getOrThrow()

        // A los 51 min se renueva, pero Storage falla: la foto sigue con la URL anterior y no cuenta como renovada.
        clock.now = clock.now.plus(Duration.ofMinutes(51))
        val renew = "2026-11-01T12:01:00.001Z"
        api.pages = api.pages + (renew to api.page(messageDto("m1", 1, body = null)))
        repo.refreshThread("t1", "s1").getOrThrow()
        assertEquals("url-vieja", photo("m1").imageUrl)
        val calls = api.historyCalls.size
        repo.refreshThread("t1", "s1").getOrThrow()
        assertEquals(renew, api.historyCalls.last())
        assertEquals(calls + 2, api.historyCalls.size)

        // Vuelve Storage: el próximo refresco la firma.
        api.pages = api.pages + (renew to api.page(messageDto("m1", 1, image = "url-nueva", body = null)))
        repo.refreshThread("t1", "s1").getOrThrow()
        assertEquals("url-nueva", photo("m1").imageUrl)
    }

    @Test fun unaFotoDePaginaViejaQueLlegaSinFirmarSeReintentaEnElProximoRefresco() = runTest {
        api.pages = mapOf(
            null to api.page(messageDto("m5", 5), nextBefore = "c5"),
            "c5" to api.page(messageDto("m1", 1, body = null)),
        )
        repo.refreshThread("t1", "s1").getOrThrow()
        repo.loadOlder("t1", "s1").getOrThrow()
        assertNull(photo("m1").imageUrl)

        // Sin esperar los 50 min: la foto nunca se firmó.
        val renew = "2026-11-01T12:01:00.001Z"
        api.pages = api.pages + (renew to api.page(messageDto("m1", 1, image = "url", body = null)))
        repo.refreshThread("t1", "s1").getOrThrow()
        assertEquals(renew, api.historyCalls.last())
        assertEquals("url", photo("m1").imageUrl)
    }

    @Test fun enLaPaginaMasNuevaUnaFirmaFallidaNoBorraLaFotoQueSeVeia() = runTest {
        api.pages = mapOf(null to api.page(messageDto("m1", 1, image = "url")))
        repo.refreshThread("t1", "s1").getOrThrow()

        api.pages = mapOf(null to api.page(messageDto("m1", 1)))
        repo.refreshThread("t1", "s1").getOrThrow()
        assertEquals("url", photo("m1").imageUrl)
    }
}
