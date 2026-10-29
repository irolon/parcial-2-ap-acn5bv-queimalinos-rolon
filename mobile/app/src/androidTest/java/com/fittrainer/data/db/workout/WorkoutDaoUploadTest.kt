package com.fittrainer.data.db.workout

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.db.FitTrainerDatabase
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Consultas de la subida (tarjeta 11). */
@RunWith(AndroidJUnit4::class)
class WorkoutDaoUploadTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: WorkoutDao

    private fun session(id: String, owner: String = "u1", status: String = STATUS_FINISHED, startedAt: Long = 1_000L) =
        WorkoutSessionEntity(id, owner, "rt-1", "Push", startedAt, startedAt + 1, status, SYNC_PENDING, 0, 1, null, null, null)

    private fun set(id: String, sessionId: String, setNumber: Int = 1) =
        WorkoutSetEntity(id, sessionId, 0, "ex-0", null, "re-0", setNumber, 40.0, 8, 2_000L + setNumber)

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
        dao = db.workoutDao()
    }

    @After fun tearDown() = db.close()

    @Test fun pendingUploadsSoloTraeTerminadasPendientesDelDuenioEnOrden() = runTest {
        dao.insertSession(session("w2", startedAt = 2_000L))
        dao.insertSession(session("w1", startedAt = 1_000L))
        dao.insertSession(session("activa", status = STATUS_ACTIVE))
        dao.insertSession(session("ajena", owner = "u2"))
        dao.insertSession(session("subida").copy(syncState = SYNC_SYNCED))

        assertEquals(listOf("w1", "w2"), dao.pendingUploads("u1").map { it.id })
    }

    @Test fun applyUploadMarcaSeriesYCierraLaSesionSinPendientes() = runTest {
        dao.insertSession(session("w1"))
        dao.upsertSet(set("s1", "w1", 1))
        dao.upsertSet(set("s2", "w1", 2))

        dao.applyUpload("w1", synced = listOf("s1"), failed = mapOf("s2" to "EXERCISE_NOT_FOUND"), rejected = false)

        assertEquals(SessionUploadRow(SYNC_SYNCED, failedSets = 1), dao.observeSessionUpload("w1").first())
        assertEquals(emptyList<WorkoutSetEntity>(), dao.pendingSets("w1"))
    }

    @Test fun applyUploadDejaPendienteLaSesionSiFaltanSeries() = runTest {
        dao.insertSession(session("w1"))
        dao.upsertSet(set("s1", "w1", 1))
        dao.upsertSet(set("s2", "w1", 2))

        dao.applyUpload("w1", synced = listOf("s1"), failed = emptyMap(), rejected = false)

        assertEquals(SYNC_PENDING, dao.observeSessionUpload("w1").first()?.syncState)
        assertEquals(listOf("s2"), dao.pendingSets("w1").map { it.id })
    }

    @Test fun applyUploadRechazadaDejaLaSesionFallidaSinTocarSusSeries() = runTest {
        dao.insertSession(session("w1"))
        dao.upsertSet(set("s1", "w1"))

        dao.applyUpload("w1", synced = emptyList(), failed = emptyMap(), rejected = true)

        assertEquals(SYNC_FAILED, dao.observeSessionUpload("w1").first()?.syncState)
        assertEquals(listOf("s1"), dao.pendingSets("w1").map { it.id })
    }

    @Test fun observeUploadCountsCuentaPendientesYFallidasDelDuenio() = runTest {
        assertEquals(UploadCounts(0, 0), dao.observeUploadCounts("u1").first())
        dao.insertSession(session("w1"))
        dao.insertSession(session("w2").copy(syncState = SYNC_FAILED))
        dao.insertSession(session("activa", status = STATUS_ACTIVE))
        dao.insertSession(session("ajena", owner = "u2"))

        assertEquals(UploadCounts(pending = 1, failed = 1), dao.observeUploadCounts("u1").first())
    }

    @Test fun observeUploadCountsCuentaLasSeriesRechazadasDeSesionesSubidas() = runTest {
        dao.insertSession(session("w1").copy(syncState = SYNC_SYNCED))
        dao.upsertSet(set("s1", "w1", 1).copy(syncState = SYNC_FAILED, syncError = "EXERCISE_NOT_FOUND"))
        dao.upsertSet(set("s2", "w1", 2).copy(syncState = SYNC_SYNCED))
        dao.insertSession(session("ajena", owner = "u2").copy(syncState = SYNC_SYNCED))
        dao.upsertSet(set("s3", "ajena", 1).copy(syncState = SYNC_FAILED, syncError = "EXERCISE_NOT_FOUND"))

        assertEquals(UploadCounts(failedSets = 1), dao.observeUploadCounts("u1").first())
    }
}
