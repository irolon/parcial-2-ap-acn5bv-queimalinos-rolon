package com.fittrainer.data.workout

import com.fittrainer.data.db.workout.FEEDBACK_NONE
import com.fittrainer.data.db.workout.FEEDBACK_PENDING
import com.fittrainer.data.db.workout.FEEDBACK_REJECTED
import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.testing.fakes.auth.fixedClock
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WorkoutRepositoryFeedbackTest {
    private val dao = FakeWorkoutDao().apply { state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession())) }
    private val repository = WorkoutRepository(dao, fixedClock(), IdGenerator { "id" })
    private fun saved() = dao.state.value.sessions.getValue("w1")

    @Test fun guardaRpeYNotaRecortadaComoPendiente() = runTest {
        repository.saveFeedback("w1", 7, "  pesado  ")
        assertEquals(7, saved().rpe)
        assertEquals("pesado", saved().notes)
        assertEquals(FEEDBACK_PENDING, saved().feedbackState)
    }

    @Test fun siElServidorRechazoLaSesionElFeedbackNaceRechazado() = runTest {
        dao.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession(syncState = SYNC_FAILED)))
        repository.saveFeedback("w1", 7, "no entra")
        assertEquals(7, saved().rpe)
        assertEquals(FEEDBACK_REJECTED, saved().feedbackState)
    }

    @Test fun notaConSoloEspaciosQuedaNula() = runTest {
        repository.saveFeedback("w1", 5, "   ")
        assertNull(saved().notes)
    }

    @Test fun sinRpeNiNotaNoEscribeNada() = runTest {
        repository.saveFeedback("w1", null, " ")
        assertEquals(FEEDBACK_NONE, saved().feedbackState)
    }

    @Test(expected = IllegalArgumentException::class)
    fun rpeFueraDeRangoSeRechaza() = runTest { repository.saveFeedback("w1", 11, null) }

    @Test(expected = IllegalArgumentException::class)
    fun notaDeMasDe1000SeRechaza() = runTest { repository.saveFeedback("w1", null, "x".repeat(1001)) }
}
