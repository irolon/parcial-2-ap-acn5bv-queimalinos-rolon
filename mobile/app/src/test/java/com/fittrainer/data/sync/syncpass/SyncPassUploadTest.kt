package com.fittrainer.data.sync.syncpass

import com.fittrainer.data.api.CreateSessionRequest
import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.api.SessionSetsRequest
import com.fittrainer.data.auth.RequiredUser
import com.fittrainer.data.db.workout.STATUS_ACTIVE
import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.sync.PassResult
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.httpError
import com.fittrainer.testing.fakes.sync.pendingSet
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class SyncPassUploadTest : SyncPassTestBase() {

    @Test fun `solo sube las terminadas pendientes del duenio`() = runTest {
        seed(
            finishedSession("w1"),
            finishedSession("activa", status = STATUS_ACTIVE),
            finishedSession("ajena", owner = "u2"),
            finishedSession("subida", syncState = SYNC_SYNCED),
        )

        assertEquals(PassResult.DONE, pass.run())

        assertEquals(listOf("w1"), api.created.map { it.id })
        assertEquals(SYNC_SYNCED, syncState("w1"))
        assertEquals(SYNC_PENDING, syncState("activa"))
        assertEquals(SYNC_PENDING, syncState("ajena"))
        assertEquals(SYNC_SYNCED, set("set-w1").syncState)
    }

    @Test fun `una serie rechazada queda FAILED con su code y la sesion igual se sube`() = runTest {
        seed(finishedSession("w1"))
        api.failCodes = mapOf("set-w1" to "EXERCISE_NOT_FOUND")

        assertEquals(PassResult.DONE, pass.run())

        assertEquals(SYNC_FAILED, set("set-w1").syncState)
        assertEquals("EXERCISE_NOT_FOUND", set("set-w1").syncError)
        assertEquals(SYNC_SYNCED, syncState("w1"))
    }

    @Test fun `una sesion rechazada queda FAILED y se sigue con la siguiente`() = runTest {
        seed(finishedSession("w1", startedAt = 1L), finishedSession("w2", startedAt = 2L))
        var calls = 0
        val failingFirst = object : SessionApi by api {
            override suspend fun create(owner: RequiredUser, body: CreateSessionRequest) {
                if (calls++ == 0) throw httpError(409) else api.create(owner, body)
            }
        }

        assertEquals(PassResult.DONE, passWith(failingFirst).run())

        assertEquals(SYNC_FAILED, syncState("w1"))
        assertEquals(SYNC_PENDING, set("set-w1").syncState)
        assertEquals(SYNC_SYNCED, syncState("w2"))
    }

    @Test fun `RETRY deja marcado lo ya subido y la sesion pendiente`() = runTest {
        seed(finishedSession("w1"))
        dao.state.value = dao.state.value.copy(
            sets = (0 until 101).map { pendingSet("s$it", "w1", setNumber = it + 1) },
        )
        var batches = 0
        val dropsSecond = object : SessionApi by api {
            override suspend fun addSets(owner: RequiredUser, id: String, body: SessionSetsRequest) =
                if (batches++ == 0) api.addSets(owner, id, body) else throw IOException("se cortó")
        }

        assertEquals(PassResult.RETRY, passWith(dropsSecond).run())

        assertEquals(SYNC_PENDING, syncState("w1"))
        assertEquals(100, dao.state.value.sets.count { it.syncState == SYNC_SYNCED })
        assertEquals(listOf("s100"), dao.state.value.sets.filter { it.syncState == SYNC_PENDING }.map { it.id })
    }

    // Pablo #32 punto 7: sin series pendientes, applyUpload la daría por subida sin existir en el servidor.
    @Test fun `si no se pudo crear, una sesion sin series pendientes no queda SYNCED`() = runTest {
        seed(finishedSession("w1"))
        dao.state.value = dao.state.value.copy(sets = emptyList())
        api.createError = IOException("sin red")

        assertEquals(PassResult.RETRY, pass.run())

        assertEquals(SYNC_PENDING, syncState("w1"))
    }
}
