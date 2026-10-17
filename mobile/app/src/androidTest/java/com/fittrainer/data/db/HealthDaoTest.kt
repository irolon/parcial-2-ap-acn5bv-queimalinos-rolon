package com.fittrainer.data.db

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HealthDaoTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: HealthDao

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java,
        ).build()
        dao = db.healthDao()
    }

    @After fun tearDown() = db.close()

    @Test fun observeSinDatosDevuelveNull() = runTest {
        assertNull(dao.observe().first())
    }

    @Test fun upsertGuardaYObserveLaDevuelve() = runTest {
        val snapshot = HealthSnapshotEntity(status = "ok", version = "0.1.0", serverTimestamp = "t1", fetchedAt = 1L)
        dao.upsert(snapshot)
        assertEquals(snapshot, dao.observe().first())
    }

    @Test fun segundoUpsertReemplazaLaUnicaFila() = runTest {
        dao.upsert(HealthSnapshotEntity(status = "ok", version = "0.1.0", serverTimestamp = "t1", fetchedAt = 1L))
        val newer = HealthSnapshotEntity(status = "ok", version = "0.2.0", serverTimestamp = "t2", fetchedAt = 2L)
        dao.upsert(newer)
        assertEquals(newer, dao.observe().first())
    }
}
