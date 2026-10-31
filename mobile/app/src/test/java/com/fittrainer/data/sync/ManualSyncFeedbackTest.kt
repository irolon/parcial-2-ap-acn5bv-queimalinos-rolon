package com.fittrainer.data.sync

import com.fittrainer.data.db.workout.FEEDBACK_PENDING
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.UploadCounts
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.sync.FakeSessionSync
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

/** Tarjeta 12: el feedback sin mandar cuenta como pendiente en "Subir ahora" y en los conteos. */
class ManualSyncFeedbackTest {
    private val dao = FakeWorkoutDao()
    private val sync = FakeSessionSync()
    private val status = UploadStatusRepository(dao)
    private val manual = ManualSync(status, sync, FakeConnectivityObserver(online = true))

    private fun put(vararg sessions: com.fittrainer.data.db.workout.WorkoutSessionEntity) {
        dao.state.value = FakeWorkoutDao.State(sessions = sessions.associateBy { it.id })
    }

    private val uploadedWithFeedback get() =
        finishedSession("w1", syncState = SYNC_SYNCED).copy(rpe = 7, feedbackState = FEEDBACK_PENDING)

    @Test fun `solo feedback pendiente y la pasada termina sin mandarlo queda FAILED`() = runTest {
        put(uploadedWithFeedback)
        assertEquals(ManualSyncResult.FAILED, manual.run("u1"))
    }

    @Test fun `solo feedback pendiente y la pasada no termina queda STILL_UPLOADING`() = runTest {
        put(uploadedWithFeedback)
        sync.syncNowResult = false
        assertEquals(ManualSyncResult.STILL_UPLOADING, manual.run("u1"))
    }

    @Test fun `si la pasada manda el feedback es DONE`() = runTest {
        put(uploadedWithFeedback)
        sync.onSyncNow = { dao.markFeedbackSynced("w1", 7, null) }
        assertEquals(ManualSyncResult.DONE, manual.run("u1"))
    }

    @Test fun `una sesion sin subir con feedback cuenta una vez`() = runTest {
        put(finishedSession("w1").copy(rpe = 7, feedbackState = FEEDBACK_PENDING))
        assertEquals(UploadCounts(pending = 1, pendingFeedback = 0), status.counts("u1"))
        assertEquals(1, status.pendingCount("u1"))
    }

    @Test fun `una sesion subida con feedback pendiente cuenta como feedback`() = runTest {
        put(uploadedWithFeedback)
        assertEquals(UploadCounts(pending = 0, pendingFeedback = 1), dao.observeUploadCounts("u1").first())
        assertEquals(1, status.pendingCount("u1"))
    }
}
