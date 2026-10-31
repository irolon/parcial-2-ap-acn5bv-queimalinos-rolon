package com.fittrainer.data.sync.syncpass

import com.fittrainer.data.api.CreateSessionRequest
import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.api.UpdateSessionRequest
import com.fittrainer.data.auth.RequiredUser
import com.fittrainer.data.db.workout.FEEDBACK_PENDING
import com.fittrainer.data.db.workout.FEEDBACK_REJECTED
import com.fittrainer.data.db.workout.FEEDBACK_SYNCED
import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.sync.PassResult
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.httpError
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SyncPassFeedbackTest : SyncPassTestBase() {
    private fun feedback(id: String) = dao.state.value.sessions.getValue(id).feedbackState

    @Test fun sesionSinSubirLlevaElFeedbackEnElPostYQuedaSubido() = runTest {
        seed(finishedSession().copy(rpe = 7, notes = "ok", feedbackState = FEEDBACK_PENDING))
        assertEquals(PassResult.DONE, pass.run())
        assertEquals(7, api.created.single().rpe)
        assertEquals(FEEDBACK_SYNCED, feedback("w1"))
        assertTrue(api.updates.isEmpty())
    }

    @Test fun sesionYaSubidaMandaPatch() = runTest {
        seed(finishedSession(syncState = SYNC_SYNCED).copy(rpe = 6, feedbackState = FEEDBACK_PENDING))
        assertEquals(PassResult.DONE, pass.run())
        assertEquals("w1", api.updates.single().first)
        assertEquals(FEEDBACK_SYNCED, feedback("w1"))
    }

    @Test fun feedbackGuardadoDuranteElPostTerminaEnPatch() = runTest {
        seed(finishedSession())
        // El alumno guarda el RPE mientras sale el POST (que se leyó sin feedback).
        val racing = object : SessionApi by api {
            override suspend fun create(owner: RequiredUser, body: CreateSessionRequest) {
                api.create(owner, body)
                dao.saveFeedback("w1", 8, null)
            }
        }
        assertEquals(PassResult.DONE, passWith(racing).run())
        assertEquals(null, api.created.single().rpe)
        assertEquals(8, api.updates.single().second.rpe)
        assertEquals(FEEDBACK_SYNCED, feedback("w1"))
    }

    @Test fun elMarcadoCondicionalNoPisaUnValorNuevo() = runTest {
        seed(finishedSession(syncState = SYNC_SYNCED).copy(rpe = 6, feedbackState = FEEDBACK_PENDING))
        val racing = object : SessionApi by api {
            override suspend fun update(owner: RequiredUser, id: String, body: UpdateSessionRequest) {
                api.update(owner, id, body)
                dao.saveFeedback("w1", 9, null)
            }
        }
        passWith(racing).run()
        assertEquals(FEEDBACK_PENDING, feedback("w1"))
    }

    @Test fun cuatrocientosCuatroDescartaElFeedback() = runTest {
        seed(finishedSession(syncState = SYNC_SYNCED).copy(rpe = 6, feedbackState = FEEDBACK_PENDING))
        api.updateError = httpError(404)
        assertEquals(PassResult.DONE, pass.run())
        assertEquals(FEEDBACK_REJECTED, feedback("w1"))
    }

    @Test fun sinRedReintentaYQuedaPendiente() = runTest {
        seed(finishedSession(syncState = SYNC_SYNCED).copy(rpe = 6, feedbackState = FEEDBACK_PENDING))
        api.updateError = IOException("sin red")
        assertEquals(PassResult.RETRY, pass.run())
        assertEquals(FEEDBACK_PENDING, feedback("w1"))
    }

    @Test fun sesionRechazadaEnElPostDescartaTambienSuFeedback() = runTest {
        seed(finishedSession().copy(rpe = 7, feedbackState = FEEDBACK_PENDING))
        api.createError = httpError(400)
        assertEquals(PassResult.DONE, pass.run())
        assertEquals(SYNC_FAILED, syncState("w1"))
        assertEquals(FEEDBACK_REJECTED, feedback("w1"))
    }
}
