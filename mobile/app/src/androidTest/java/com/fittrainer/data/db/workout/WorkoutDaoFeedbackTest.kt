package com.fittrainer.data.db.workout

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.db.FitTrainerDatabase
import com.fittrainer.data.db.workout.history.HistorySessionEntity
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Feedback post-entreno en Room (tarjeta 12): marcas de subida, conteos y lo que suma el historial. */
@RunWith(AndroidJUnit4::class)
class WorkoutDaoFeedbackTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: WorkoutDao

    private fun session(
        id: String, syncState: String = SYNC_SYNCED, startedAt: Long = 1_000, rpe: Int? = null, notes: String? = null,
        feedback: String = FEEDBACK_NONE,
    ) = WorkoutSessionEntity(
        id, "u1", "rt-1", "Push", startedAt, startedAt + 1, STATUS_FINISHED, syncState, 0, 1, null, null, null,
        rpe = rpe, notes = notes, feedbackState = feedback,
    )

    private fun cached(id: String, startedAt: Long) =
        HistorySessionEntity(id, "u1", startedAt, startedAt + 1, 1, "Push", null, null, null, false, 3, 300.0, false, true, true)

    private suspend fun feedbackOf(id: String) = dao.observeForHistory("u1").first().first { it.session.id == id }.session.feedbackState

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
        dao = db.workoutDao()
    }

    @After fun tearDown() = db.close()

    @Test fun markFeedbackSyncedMarcaConNotaNulaPorqueIsNullAndaEnSql() = runTest {
        dao.insertSession(session("a", rpe = 7, notes = null, feedback = FEEDBACK_PENDING))
        dao.markFeedbackSynced("a", 7, null)
        assertEquals(FEEDBACK_SYNCED, feedbackOf("a"))
    }

    @Test fun markFeedbackSyncedNoMarcaSiCambiaronLosValores() = runTest {
        dao.insertSession(session("a", rpe = 7, notes = "otra", feedback = FEEDBACK_PENDING))
        dao.markFeedbackSynced("a", 7, null)
        dao.markFeedbackSynced("a", 6, "otra")
        assertEquals(FEEDBACK_PENDING, feedbackOf("a"))
    }

    @Test fun observeUploadCountsContaFeedbackSoloDeSubidasConPendiente() = runTest {
        dao.insertSession(session("ok", SYNC_SYNCED, rpe = 5, feedback = FEEDBACK_PENDING))
        dao.insertSession(session("sinSubir", SYNC_PENDING, rpe = 5, feedback = FEEDBACK_PENDING))
        dao.insertSession(session("enviado", SYNC_SYNCED, rpe = 5, feedback = FEEDBACK_SYNCED))
        dao.insertSession(session("rechazado", SYNC_SYNCED, rpe = 5, feedback = FEEDBACK_REJECTED))
        val counts = dao.observeUploadCounts("u1").first()
        assertEquals(1, counts.pendingFeedback)
        assertEquals(1, counts.pending)
    }

    @Test fun observeForHistoryIncluyeLaCacheadaConFeedbackPendienteOEnviado() = runTest {
        db.historyDao().upsertSessions(listOf(cached("p", 9_000), cached("e", 8_000), cached("n", 7_000), cached("v", 6_000)))
        dao.insertSession(session("p", startedAt = 1_000, rpe = 8, feedback = FEEDBACK_PENDING))
        dao.insertSession(session("e", startedAt = 2_000, rpe = 6, feedback = FEEDBACK_SYNCED))
        dao.insertSession(session("n", startedAt = 3_000)) // sin feedback y cacheada: no suma
        dao.insertSession(session("v", startedAt = 4_000, feedback = FEEDBACK_SYNCED)) // enviado pero sin valores: no suma
        assertEquals(listOf("e", "p"), dao.observeForHistory("u1").first().map { it.session.id })
    }

    @Test fun saveFeedbackDeUnaSesionRechazadaNaceRechazado() = runTest {
        dao.insertSession(session("f", SYNC_FAILED))
        dao.insertSession(session("ok", SYNC_PENDING, startedAt = 2_000))
        dao.saveFeedback("f", 7, "x")
        dao.saveFeedback("ok", 7, "x")
        assertEquals(FEEDBACK_REJECTED, feedbackOf("f"))
        assertEquals(FEEDBACK_PENDING, feedbackOf("ok"))
    }
}
