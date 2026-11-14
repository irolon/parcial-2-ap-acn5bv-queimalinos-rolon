package com.fittrainer.data.db.gamification

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.db.FitTrainerDatabase
import com.fittrainer.data.db.workout.STATUS_ACTIVE
import com.fittrainer.data.db.workout.STATUS_FINISHED
import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.WorkoutSessionEntity
import com.fittrainer.data.gamification.FinishedSession
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class GamificationDaoTest {
    private val db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
    private val dao = db.gamificationDao()

    private fun session(id: String, owner: String, status: String, sync: String, startedAt: Long, finishedAt: Long?) = WorkoutSessionEntity(
        id, owner, null, "Rutina", startedAt, finishedAt, status, sync, 0, 0, null, null, null,
    )

    @After fun close() = db.close()

    @Test fun reinsertarUnaCelebracionNoPisaElEstado() = runBlocking {
        val row = CelebrationEntity("u1", "FIRST_PR", "Primer récord", null, "pr", CELEBRATION_PENDING, 100)
        dao.insertCelebrations(listOf(row))
        dao.markShown("u1", listOf("FIRST_PR"))
        dao.insertCelebrations(listOf(row))

        assertEquals(emptyList<CelebrationEntity>(), dao.observePending("u1").first())
        val count = db.openHelper.readableDatabase.query("SELECT state FROM celebrations WHERE ownerId = 'u1' AND code = 'FIRST_PR'").use { c ->
            c.moveToFirst()
            assertEquals(CELEBRATION_SHOWN, c.getString(0))
            c.count
        }
        assertEquals(1, count)
    }

    @Test fun sesionesTerminadasSoloLasDelDuenoSinActivasNiRechazadas() = runBlocking {
        db.workoutDao().insertSession(session("ok1", "u1", STATUS_FINISHED, SYNC_PENDING, 10, 20))
        db.workoutDao().insertSession(session("ok2", "u1", STATUS_FINISHED, SYNC_SYNCED, 30, 40))
        db.workoutDao().insertSession(session("rechazada", "u1", STATUS_FINISHED, SYNC_FAILED, 50, 60))
        db.workoutDao().insertSession(session("activa", "u1", STATUS_ACTIVE, SYNC_PENDING, 70, null))
        db.workoutDao().insertSession(session("sinCierre", "u1", STATUS_FINISHED, SYNC_PENDING, 80, null))
        db.workoutDao().insertSession(session("ajena", "u2", STATUS_FINISHED, SYNC_PENDING, 90, 100))

        val expected = setOf(FinishedSession(10, 20), FinishedSession(30, 40))
        assertEquals(expected, dao.finishedSessions("u1").toSet())
        assertEquals(expected, dao.observeFinishedSessions("u1").first().toSet())
    }
}
