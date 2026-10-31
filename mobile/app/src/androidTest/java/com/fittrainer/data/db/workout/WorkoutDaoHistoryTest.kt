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

/** Consulta del historial que suma las sesiones del celular (tarjeta 12). */
@RunWith(AndroidJUnit4::class)
class WorkoutDaoHistoryTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: WorkoutDao

    private fun session(id: String, syncState: String, startedAt: Long) =
        WorkoutSessionEntity(id, "u1", "rt-1", "Push", startedAt, startedAt + 1, STATUS_FINISHED, syncState, 0, 1, null, null, null)

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
        dao = db.workoutDao()
    }

    @After fun tearDown() = db.close()

    @Test fun observeForHistorySumaLasSinSubirYLasSubidasMasNuevasQueElCache() = runTest {
        db.historyDao().upsertSessions(
            listOf(HistorySessionEntity("a", "u1", 5_000, 6_000, 1, "Push", null, null, null, false, 3, 300.0, false, true, true)),
        )
        dao.insertSession(session("p", SYNC_PENDING, 1_000))
        dao.insertSession(session("s", SYNC_SYNCED, 9_000))
        dao.insertSession(session("v", SYNC_SYNCED, 2_000))

        assertEquals(listOf("s", "p"), dao.observeForHistory("u1").first().map { it.session.id })
    }
}
