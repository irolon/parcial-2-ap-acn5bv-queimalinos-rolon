package com.fittrainer.data.messages.trainer

import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesApi
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesDao
import com.fittrainer.testing.fakes.messages.messageDto
import com.fittrainer.testing.fakes.routine.StepClock
import java.time.Instant
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #73: has_image distingue una foto con texto que no se pudo firmar de un mensaje de solo texto. */
class TrainerMessagesRepositoryHasImageTest {
    private val api = FakeTrainerMessagesApi()
    private val repo = TrainerMessagesRepository(api, FakeTrainerMessagesDao(), StepClock(Instant.parse("2026-11-01T13:00:00Z")))

    private suspend fun message(id: String) = repo.observeThread("t1", "s1").first()!!.messages.first { it.id == id }

    @Test fun unaFotoConTextoSinFirmarSeMarcaYSeReintentaEnElProximoRefresco() = runTest {
        api.pages = mapOf(
            null to api.page(messageDto("m5", 5), nextBefore = "c5"),
            "c5" to api.page(messageDto("m1", 1, body = "mirá", hasImage = true)),
        )
        repo.refreshThread("t1", "s1").getOrThrow()
        repo.loadOlder("t1", "s1").getOrThrow()
        assertTrue(message("m1").hasImage)
        assertNull(message("m1").imageUrl)

        // Sin esperar los 50 min: antes de la #73 este mensaje se veía como de solo texto y nunca se reintentaba.
        val renew = "2026-11-01T12:01:00.001Z"
        api.pages = api.pages + (renew to api.page(messageDto("m1", 1, image = "url", body = "mirá", hasImage = true)))
        repo.refreshThread("t1", "s1").getOrThrow()
        assertEquals(renew, api.historyCalls.last())
        assertEquals("url", message("m1").imageUrl)
    }

    @Test fun unMensajeDeSoloTextoNoPideRenovarFotos() = runTest {
        api.pages = mapOf(null to api.page(messageDto("m1", 1, body = "hola", hasImage = false)))
        repo.refreshThread("t1", "s1").getOrThrow()
        repo.refreshThread("t1", "s1").getOrThrow()
        assertFalse(message("m1").hasImage)
        assertEquals(listOf<String?>(null, null), api.historyCalls)
    }

    @Test fun sinElCampoSeDeduceComoAntes() = runTest {
        api.pages = mapOf(
            null to api.page(
                messageDto("m1", 1, body = null),
                messageDto("m2", 2, image = "url"),
                messageDto("m3", 3, body = "texto"),
            ),
        )
        repo.refreshThread("t1", "s1").getOrThrow()
        assertTrue(message("m1").hasImage)
        assertTrue(message("m2").hasImage)
        assertFalse(message("m3").hasImage)
    }
}
