package com.fittrainer.data.db.library

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
class LibraryDaoTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: LibraryDao

    private fun exercise(id: String, position: Int) =
        LibraryExerciseEntity(id, "Ejercicio $id", "chest", null, null, null, position)

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java,
        ).build()
        dao = db.libraryDao()
    }

    @After fun tearDown() = db.close()

    @Test fun replaceAllReemplazaTodoYOrdenaPorPosicion() = runTest {
        dao.replaceAll(LibrarySyncEntity(ownerId = "u1", lastSyncedAt = 1L), listOf(exercise("a", 0)))
        dao.replaceAll(LibrarySyncEntity(ownerId = "u1", lastSyncedAt = 2L), listOf(exercise("c", 1), exercise("b", 0)))

        assertEquals(listOf("b", "c"), dao.observeExercises().first().map { it.id })
        assertEquals(2L, dao.observeSync().first()?.lastSyncedAt)
    }

    @Test fun snapshotDeOtroDuenioEsNull() = runTest {
        dao.replaceAll(LibrarySyncEntity(ownerId = "u1", lastSyncedAt = 1L), listOf(exercise("a", 0)))

        assertNull(dao.snapshot("u2"))
        assertEquals(listOf("a"), dao.snapshot("u1")?.exercises?.map { it.id })
    }

    @Test fun clearIfOwnerSoloBorraElCacheDeEseDuenio() = runTest {
        dao.replaceAll(LibrarySyncEntity(ownerId = "u1", lastSyncedAt = 1L), listOf(exercise("a", 0)))

        dao.clearIfOwner("u2")
        assertEquals(1, dao.getExercises().size)

        dao.clearIfOwner("u1")
        assertTrue(dao.getExercises().isEmpty())
        assertNull(dao.getSync())
    }
}
