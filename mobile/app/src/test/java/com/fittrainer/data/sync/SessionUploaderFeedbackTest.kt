package com.fittrainer.data.sync

import com.fittrainer.data.api.UpdateSessionRequest
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.httpError
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class SessionUploaderFeedbackTest {
    private val api = FakeSessionApi()
    private val uploader = SessionUploader(api)
    private val withFeedback = finishedSession().copy(rpe = 7, notes = "pesado")

    @Test fun elPostLlevaRpeYNota() = runTest {
        uploader.upload("u1", withFeedback, emptyList())
        assertEquals(7, api.created.single().rpe)
        assertEquals("pesado", api.created.single().notes)
    }

    @Test fun sendFeedbackMandaElPatch() = runTest {
        assertEquals(FeedbackOutcome.SENT, uploader.sendFeedback("u1", withFeedback))
        assertEquals("w1" to UpdateSessionRequest(7, "pesado"), api.updates.single())
    }

    @Test fun cuatrocientosYCuatrocientosCuatroRechazan() = runTest {
        api.updateError = httpError(404)
        assertEquals(FeedbackOutcome.REJECTED, uploader.sendFeedback("u1", withFeedback))
        api.updateError = httpError(400)
        assertEquals(FeedbackOutcome.REJECTED, uploader.sendFeedback("u1", withFeedback))
    }

    @Test fun redYQuinientosReintentan() = runTest {
        api.updateError = IOException("sin red")
        assertEquals(FeedbackOutcome.RETRY, uploader.sendFeedback("u1", withFeedback))
        api.updateError = httpError(503)
        assertEquals(FeedbackOutcome.RETRY, uploader.sendFeedback("u1", withFeedback))
    }

    @Test fun cambioDeCuentaYCuatrocientosTresLoDejanPendiente() = runTest {
        api.account = { "otro" }
        assertEquals(FeedbackOutcome.KEEP, uploader.sendFeedback("u1", withFeedback))
        api.account = null
        api.updateError = httpError(403)
        assertEquals(FeedbackOutcome.KEEP, uploader.sendFeedback("u1", withFeedback))
    }

    @Test fun cuatrocientosUnoEsUnauthorized() = runTest {
        api.updateError = httpError(401)
        assertEquals(FeedbackOutcome.UNAUTHORIZED, uploader.sendFeedback("u1", withFeedback))
    }
}
