package com.fittrainer.data.db.workout

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.db.FitTrainerDatabase
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class WorkoutDaoTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: WorkoutDao

    private fun session(id: String, owner: String = "u1", status: String = STATUS_ACTIVE) = WorkoutSessionEntity(
        id, owner, "rt-1", "Push", 1_000L, null, status, SYNC_PENDING, 0, 1, null, null, null,
    )

    private fun exercise(sessionId: String, position: Int = 0) = WorkoutExerciseEntity(
        sessionId, position, "re-$position", "ex-$position", null, "Press", "chest", null, null, null, 4, 8, 90, 40.0,
    )

    private fun set(id: String, sessionId: String, setNumber: Int = 1, kg: Double = 40.0, at: Long = 2_000L) =
        WorkoutSetEntity(id, sessionId, 0, "ex-0", null, "re-0", setNumber, kg, 8, at)

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
        dao = db.workoutDao()
    }

    @After fun tearDown() = db.close()

    @Test fun startGuardaLaSesionConSuPlanYSeObservaSoloParaSuDuenio() = runTest {
        dao.start(session("w1"), listOf(exercise("w1", 0), exercise("w1", 1)))

        assertEquals(2, dao.observeActive("u1").first()?.exercises?.size)
        assertNull(dao.observeActive("u2").first())
    }

    @Test fun startFallaSiYaHayUnaSesionAbierta() = runTest {
        dao.start(session("w1"), listOf(exercise("w1")))

        val error = runCatching { dao.start(session("w2"), listOf(exercise("w2"))) }.exceptionOrNull()

        assertTrue(error is IllegalStateException)
        assertEquals("w1", dao.getActive("u1")?.session?.id)
    }

    @Test fun saveSetConElMismoIdCorrigeSinDuplicar() = runTest {
        dao.start(session("w1"), listOf(exercise("w1")))
        dao.saveSet(set("s1", "w1"), session("w1").copy(currentSet = 2))
        dao.upsertSet(set("s1", "w1", kg = 42.5))

        val active = dao.getActive("u1")!!
        assertEquals(listOf(42.5), active.sets.map { it.actualKg })
        assertEquals(2, active.session.currentSet)
    }

    @Test fun lastSetForIgnoraSesionesAbiertasYDeOtroDuenio() = runTest {
        dao.insertSession(session("old", status = STATUS_FINISHED))
        dao.upsertSet(set("a", "old", kg = 50.0, at = 5_000L))
        dao.insertSession(session("other", owner = "u2", status = STATUS_FINISHED))
        dao.upsertSet(set("b", "other", kg = 99.0, at = 9_000L))
        dao.start(session("now"), listOf(exercise("now")))
        dao.upsertSet(set("c", "now", kg = 70.0, at = 8_000L))

        assertEquals(50.0, dao.lastSetFor("u1", "ex-0")?.actualKg)
    }

    @Test fun deleteSessionBorraEnCascada() = runTest {
        dao.start(session("w1"), listOf(exercise("w1")))
        dao.upsertSet(set("s1", "w1"))

        dao.deleteSession("w1")

        assertNull(dao.getActive("u1"))
        assertNull(dao.lastSetFor("u1", "ex-0"))
        db.openHelper.readableDatabase.query("SELECT COUNT(*) FROM workout_sets").use {
            it.moveToFirst()
            assertEquals(0, it.getInt(0))
        }
    }
}
