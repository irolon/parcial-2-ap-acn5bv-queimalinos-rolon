package com.fittrainer.data.workout.history

import com.fittrainer.data.db.workout.history.HistorySessionEntity
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class HistoryRepositoryUnreadTest {
    private val history = FakeHistoryDao()
    private val workouts = FakeWorkoutDao()
    private val repository = HistoryRepository(FakeSessionApi(), history, workouts) { FakeStudentSession() }

    private fun cached(id: String, comment: String?, owner: String = "u1") =
        HistorySessionEntity(id, owner, 1_000, 2_000, 50, "Push", null, null, comment, false, 3, 300.0, false, true, true)

    private fun seed(vararg sessions: HistorySessionEntity) {
        history.state.value = FakeHistoryDao.State(sessions = sessions.associateBy { it.id })
    }

    @Test fun cuentaSoloLasDelServidorConComentario() = runTest {
        seed(cached("a", "Bien"), cached("b", null), cached("c", "  "))
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession(startedAt = 5_000)))
        assertEquals(1, repository.observeUnreadComments("u1").first())
    }

    @Test fun marcarLeidoBajaElConteoYLaMarcaDeLaLista() = runTest {
        seed(cached("a", "Bien"))
        assertTrue(repository.observe("u1").first().single().commentUnread)
        repository.markCommentSeen("u1", "a", "Bien")
        assertEquals(0, repository.observeUnreadComments("u1").first())
        assertFalse(repository.observe("u1").first().single().commentUnread)
        assertTrue(repository.observe("u1").first().single().hasComment)
    }

    @Test fun siElEntrenadorCambiaElTextoVuelveAContarComoNuevo() = runTest {
        seed(cached("a", "Bien"))
        repository.markCommentSeen("u1", "a", "Bien")
        val st = history.state.value
        history.state.value = st.copy(sessions = mapOf("a" to cached("a", "Bien, subí el peso")))
        assertEquals(1, repository.observeUnreadComments("u1").first())
        assertTrue(repository.observe("u1").first().single().commentUnread)
    }

    @Test fun otroDuenoNoVeNada() = runTest {
        seed(cached("a", "Bien", owner = "u2"))
        assertEquals(0, repository.observeUnreadComments("u1").first())
        assertTrue(repository.observe("u1").first().isEmpty())
    }

    @Test fun lasLocalesNuncaTienenComentarioSinLeer() = runTest {
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession(startedAt = 5_000)))
        assertFalse(repository.observe("u1").first().single().commentUnread)
    }

    @Test fun clearUserDataBorraLosLeidosDelDueno() = runTest {
        seed(cached("a", "Bien"), cached("x", "Hola", owner = "u2"))
        repository.markCommentSeen("u1", "a", "Bien")
        repository.markCommentSeen("u2", "x", "Hola")
        repository.clearUserData("u1")
        assertEquals(listOf("x"), history.state.value.seen.map { it.sessionId })
        repository.clearUserData(null)
        assertTrue(history.state.value.seen.isEmpty())
    }
}
