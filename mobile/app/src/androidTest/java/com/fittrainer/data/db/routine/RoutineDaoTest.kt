package com.fittrainer.data.db.routine

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
class RoutineDaoTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: RoutineDao

    private fun routine(id: String) = RoutineEntity(id, "Rutina $id", null, "monday,thursday", 1L)

    private fun exercise(id: String, routineId: String, order: Int = 0) = RoutineExerciseEntity(
        id = id, routineId = routineId, exerciseId = "ex-$id", name = "Press", muscleGroup = "chest",
        equipment = null, videoUrl = null, sets = 4, reps = 8, restSeconds = 90, suggestedKg = 40.0,
        tempo = null, notes = null, orderIndex = order,
    )

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java,
        ).build()
        dao = db.routineDao()
    }

    @After fun tearDown() = db.close()

    @Test fun sinDatosNoHayRutinasNiSync() = runTest {
        assertTrue(dao.observeRoutines().first().isEmpty())
        assertNull(dao.observeSync().first())
    }

    @Test fun replaceAllGuardaRutinasConSusEjerciciosYElDuenio() = runTest {
        val sync = RoutineSyncEntity(ownerId = "u1", lastSyncedAt = 5L)
        dao.replaceAll(sync, listOf(routine("rt-1")), listOf(exercise("re-1", "rt-1"), exercise("re-2", "rt-1", 1)))

        val rows = dao.observeRoutines().first()
        assertEquals(listOf("rt-1"), rows.map { it.routine.id })
        assertEquals(setOf("re-1", "re-2"), rows.single().exercises.map { it.id }.toSet())
        assertEquals(sync, dao.observeSync().first())
    }

    @Test fun replaceAllBorraLoAnterior() = runTest {
        dao.replaceAll(RoutineSyncEntity(ownerId = "u1", lastSyncedAt = 1L), listOf(routine("rt-1")), listOf(exercise("re-1", "rt-1")))
        dao.replaceAll(RoutineSyncEntity(ownerId = "u1", lastSyncedAt = 2L), listOf(routine("rt-2")), listOf(exercise("re-9", "rt-2")))

        val rows = dao.observeRoutines().first()
        assertEquals(listOf("rt-2"), rows.map { it.routine.id })
        assertEquals(listOf("re-9"), rows.single().exercises.map { it.id })
        assertEquals(2L, dao.observeSync().first()?.lastSyncedAt)
    }

    @Test fun clearDejaTodoVacio() = runTest {
        dao.replaceAll(RoutineSyncEntity(ownerId = "u1", lastSyncedAt = 1L), listOf(routine("rt-1")), listOf(exercise("re-1", "rt-1")))
        dao.clear()
        assertTrue(dao.observeRoutines().first().isEmpty())
        assertNull(dao.observeSync().first())
    }

    @Test fun snapshotSoloDevuelveElCacheDeSuDuenio() = runTest {
        dao.replaceAll(RoutineSyncEntity(ownerId = "u1", lastSyncedAt = 1L), listOf(routine("rt-1")), listOf(exercise("re-1", "rt-1")))

        assertNull(dao.snapshot("u2"))
        val mine = dao.snapshot("u1")!!
        assertEquals("u1", mine.sync.ownerId)
        assertEquals(listOf("rt-1"), mine.routines.map { it.routine.id })
    }

    @Test fun clearIfOwnerNoBorraElCacheDeOtro() = runTest {
        dao.replaceAll(RoutineSyncEntity(ownerId = "u2", lastSyncedAt = 1L), listOf(routine("rt-2")), listOf(exercise("re-2", "rt-2")))

        dao.clearIfOwner("u1")
        assertEquals(listOf("rt-2"), dao.observeRoutines().first().map { it.routine.id })

        dao.clearIfOwner("u2")
        assertTrue(dao.observeRoutines().first().isEmpty())
        assertNull(dao.observeSync().first())
    }
}
