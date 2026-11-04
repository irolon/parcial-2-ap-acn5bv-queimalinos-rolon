package com.fittrainer.data.messages.trainer

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesApi
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesDao
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Tarjeta 18: el alumno manda una foto (multipart). El dueño del caché es el propio alumno. */
class TrainerMessagesRepositoryPhotoTest {
    private val api = FakeTrainerMessagesApi().apply { sender = "student" }
    private val repo = TrainerMessagesRepository(api, FakeTrainerMessagesDao(), Clock.fixed(Instant.parse("2026-11-01T13:00:00Z"), ZoneOffset.UTC))
    private val jpeg = byteArrayOf(1, 2, 3)

    private suspend fun messages() = repo.observeThread("s1", "s1").first()!!.messages

    @Test fun laFotoConEpigrafeSeGuardaEnElChat() = runTest {
        repo.refreshThread("s1", "s1").getOrThrow()
        repo.sendPhoto("s1", "s1", jpeg, "  Así quedó  ").getOrThrow()
        val (student, bytes, caption) = api.photos.single()
        assertEquals("s1", student)
        assertArrayEquals(jpeg, bytes)
        assertEquals("Así quedó", caption)
        val sent = messages().last()
        assertEquals("Así quedó", sent.body)
        assertTrue(sent.imageUrl!!.startsWith("url-"))
        assertTrue(!sent.fromTrainer)
    }

    @Test fun sinEpigrafeNoSeMandaElCampoBody() = runTest {
        repo.sendPhoto("s1", "s1", jpeg, "   ").getOrThrow()
        assertNull(api.photos.single().third)
    }

    @Test fun unaFotoRechazadaDaPhotoRejected() = runTest {
        for (status in listOf(413, 415)) {
            api.sendError = apiError(status, if (status == 413) "IMAGE_TOO_LARGE" else "IMAGE_TYPE_INVALID")
            assertTrue(repo.sendPhoto("s1", "s1", jpeg, null).exceptionOrNull() is PhotoRejectedException)
        }
    }

    @Test fun sinRedDaOffline() = runTest {
        api.sendError = IOException()
        val error = repo.sendPhoto("s1", "s1", jpeg, null).exceptionOrNull() as DataException
        assertEquals(DataError.Offline, error.error)
        assertTrue(api.photos.isEmpty())
    }
}
