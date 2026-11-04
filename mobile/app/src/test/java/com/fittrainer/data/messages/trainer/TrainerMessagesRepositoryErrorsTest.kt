package com.fittrainer.data.messages.trainer

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesApi
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesDao
import com.fittrainer.testing.fakes.messages.messageDto
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TrainerMessagesRepositoryErrorsTest {
    private val api = FakeTrainerMessagesApi()
    private val dao = FakeTrainerMessagesDao()
    private val repo = TrainerMessagesRepository(api, dao, Clock.fixed(Instant.parse("2026-11-01T13:00:00Z"), ZoneOffset.UTC))

    @Test fun alumnoDadoDeBajaDaStudentInactive() = runTest {
        api.sendError = apiError(409, "STUDENT_INACTIVE")
        assertTrue(repo.send("t1", "s1", "Hola").exceptionOrNull() is StudentInactiveException)
    }

    @Test fun unaConversacionAjenaSaleDelCacheConSuChat() = runTest {
        repo.refreshConversations("t1").getOrThrow()
        repo.refreshThread("t1", "s1").getOrThrow()
        api.error = apiError(403, "FORBIDDEN")
        val error = repo.refreshThread("t1", "s1").exceptionOrNull() as DataException
        assertEquals(DataError.NotFound, error.error)
        assertNull(repo.observeThread("t1", "s1").first())
        assertEquals(listOf("s2"), repo.observeConversations("t1").first()!!.conversations.map { it.studentId })
    }

    @Test fun sinRedNoTocaLoGuardado() = runTest {
        repo.refreshThread("t1", "s1").getOrThrow()
        api.sendError = IOException("sin red")
        val error = repo.send("t1", "s1", "Hola").exceptionOrNull() as DataException
        assertEquals(DataError.Offline, error.error)
        assertEquals(2, repo.observeThread("t1", "s1").first()!!.messages.size)
    }

    @Test fun cerrarSesionBorraSoloLoDeEseEntrenador() = runTest {
        repo.refreshConversations("t1").getOrThrow()
        repo.refreshConversations("t2").getOrThrow()
        repo.clearUserData("t1")
        assertNull(repo.observeConversations("t1").first())
        assertEquals(2, repo.observeConversations("t2").first()!!.conversations.size)
    }

    // Sin el Mutex, el GET de la primera carga (que reemplaza el chat) borraba el mensaje recién enviado.
    @Test fun unGetQueSalioAntesDeEnviarNoBorraElMensaje() = runTest {
        api.pages = mapOf(null to api.page(messageDto("m1", 1)))
        api.gate = CompletableDeferred()
        val refresh = async { repo.refreshThread("t1", "s1") }
        advanceUntilIdle()
        val send = async { repo.send("t1", "s1", "Hola") }
        advanceUntilIdle()
        api.gate!!.complete(Unit)
        refresh.await().getOrThrow()
        send.await().getOrThrow()
        assertEquals(listOf("m1", "new100"), repo.observeThread("t1", "s1").first()!!.messages.map { it.id })
    }
}
