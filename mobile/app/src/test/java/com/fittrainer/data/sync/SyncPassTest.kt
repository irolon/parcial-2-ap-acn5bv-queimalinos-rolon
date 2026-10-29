package com.fittrainer.data.sync

import com.fittrainer.data.api.CreateSessionRequest
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.api.SessionSetsRequest
import com.fittrainer.data.db.workout.STATUS_ACTIVE
import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.WorkoutSessionEntity
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.httpError
import com.fittrainer.testing.fakes.sync.pendingSet
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SyncPassTest {

    private val dao = FakeWorkoutDao()
    private val api = FakeSessionApi()
    private val session = FakeStudentSession()
    private val pass = SyncPass(dao, SessionUploader(api), session)

    private fun seed(vararg sessions: WorkoutSessionEntity) {
        dao.state.value = FakeWorkoutDao.State(
            sessions = sessions.associateBy { it.id },
            sets = sessions.map { pendingSet("set-${it.id}", it.id) },
        )
    }

    private fun syncState(id: String) = dao.state.value.sessions.getValue(id).syncState
    private fun set(id: String) = dao.state.value.sets.single { it.id == id }

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
            override suspend fun create(body: CreateSessionRequest) {
                if (calls++ == 0) throw httpError(409) else api.create(body)
            }
        }

        assertEquals(PassResult.DONE, SyncPass(dao, SessionUploader(failingFirst), session).run())

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
            override suspend fun addSets(id: String, body: SessionSetsRequest) =
                if (batches++ == 0) api.addSets(id, body) else throw IOException("se cortó")
        }

        assertEquals(PassResult.RETRY, SyncPass(dao, SessionUploader(dropsSecond), session).run())

        assertEquals(SYNC_PENDING, syncState("w1"))
        assertEquals(100, dao.state.value.sets.count { it.syncState == SYNC_SYNCED })
        assertEquals(listOf("s100"), dao.state.value.sets.filter { it.syncState == SYNC_PENDING }.map { it.id })
    }

    @Test fun `sin red pide reintento y no marca nada`() = runTest {
        seed(finishedSession("w1", startedAt = 1L), finishedSession("w2", startedAt = 2L))
        api.createError = IOException("sin red")

        assertEquals(PassResult.RETRY, pass.run())

        assertEquals(1, api.createCalls) // se cortó en la primera: no intentó la segunda
        assertEquals(SYNC_PENDING, syncState("w1"))
        assertEquals(SYNC_PENDING, syncState("w2"))
    }

    @Test fun `401 con el refresh rechazado corta sin reintentar y deja todo pendiente`() = runTest {
        seed(finishedSession("w1", startedAt = 1L), finishedSession("w2", startedAt = 2L))
        val refreshRejected = object : SessionApi by api {
            override suspend fun create(body: CreateSessionRequest) {
                session.session.value = Session.LoggedOut // TokenAuthenticator borró la sesión
                throw httpError(401)
            }
        }

        assertEquals(PassResult.DONE, SyncPass(dao, SessionUploader(refreshRejected), session).run())

        assertEquals(SYNC_PENDING, syncState("w1"))
        assertEquals(SYNC_PENDING, syncState("w2"))
    }

    @Test fun `401 con la sesion todavia abierta es pasajero y pide reintento`() = runTest {
        // El refresh falló por red o 5xx: TokenAuthenticator deja la sesión y el 401 llega tal cual.
        seed(finishedSession("w1", startedAt = 1L), finishedSession("w2", startedAt = 2L))
        api.createError = httpError(401)

        assertEquals(PassResult.RETRY, pass.run())

        assertEquals(1, api.createCalls) // se cortó en la primera: no intentó la segunda
        assertEquals(SYNC_PENDING, syncState("w1"))
        assertEquals(SYNC_PENDING, syncState("w2"))
    }

    @Test fun `403 con la sesion abierta es definitivo y no reintenta`() = runTest {
        // Rol equivocado: reintentar da lo mismo (spec §5). A diferencia del 401, no depende del refresh.
        seed(finishedSession("w1", startedAt = 1L), finishedSession("w2", startedAt = 2L))
        api.createError = httpError(403)

        assertEquals(PassResult.DONE, pass.run())

        assertEquals(1, api.createCalls)
        assertEquals(SYNC_PENDING, syncState("w1"))
        assertEquals(SYNC_PENDING, syncState("w2"))
    }

    @Test fun `si cambia el alumno logueado a mitad de la pasada no sube nada mas`() = runTest {
        seed(finishedSession("w1", startedAt = 1L), finishedSession("w2", startedAt = 2L))
        val otherStudent = Session.Student(AuthUser("u2", "Beto", "beto@test.com", Role.STUDENT))
        val switchesUser = object : SessionApi by api {
            override suspend fun create(body: CreateSessionRequest) {
                api.create(body)
                session.session.value = otherStudent // A cerró sesión y entró B mientras se subía w1
            }
        }

        assertEquals(PassResult.DONE, SyncPass(dao, SessionUploader(switchesUser), session).run())

        assertEquals(listOf("w1"), api.created.map { it.id })
        assertEquals(SYNC_PENDING, syncState("w2"))
    }

    @Test fun `sin alumno logueado no hace nada`() = runTest {
        seed(finishedSession("w1"))
        session.session.value = Session.LoggedOut

        assertEquals(PassResult.DONE, pass.run())

        assertTrue(api.created.isEmpty())
    }
}
