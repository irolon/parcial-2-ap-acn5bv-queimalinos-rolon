package com.fittrainer.data.sync.syncpass

import com.fittrainer.data.api.CreateSessionRequest
import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.auth.RequiredUser
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import com.fittrainer.data.sync.PassResult
import com.fittrainer.testing.fakes.sync.finishedSession
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** Nunca se sube con la cuenta de otro alumno (spec §5): ni entre sesiones ni entre requests. */
class SyncPassAccountTest : SyncPassTestBase() {

    private val otherStudent = Session.Student(AuthUser("u2", "Beto", "beto@test.com", Role.STUDENT))

    @Before fun interceptorChecksTheAccount() {
        // Como AuthInterceptor: la request sale solo si la cuenta logueada es la dueña.
        api.account = { (session.session.value as? Session.Student)?.user?.id }
    }

    @Test fun `si cambia el alumno logueado a mitad de la pasada no sube nada mas`() = runTest {
        seed(finishedSession("w1", startedAt = 1L), finishedSession("w2", startedAt = 2L))
        val switchesUser = object : SessionApi by api {
            override suspend fun create(owner: RequiredUser, body: CreateSessionRequest) {
                api.create(owner, body)
                session.session.value = otherStudent // A cerró sesión y entró B mientras se subía w1
            }
        }

        assertEquals(PassResult.DONE, passWith(switchesUser).run())

        assertEquals(listOf("w1"), api.created.map { it.id })
        assertTrue(api.batches.isEmpty()) // las series de w1 tampoco salieron con la cuenta de B
        assertEquals(SYNC_PENDING, syncState("w1"))
        assertEquals(SYNC_PENDING, syncState("w2"))
    }

    // Pablo #32 punto 3: el cambio cae entre el chequeo de la pasada y el POST /sessions.
    @Test fun `si la cuenta cambia justo antes de crear la sesion, la request no sale`() = runTest {
        seed(finishedSession("w1"))
        val switchesBeforeCreate = object : SessionApi by api {
            override suspend fun create(owner: RequiredUser, body: CreateSessionRequest) {
                session.session.value = otherStudent
                api.create(owner, body)
            }
        }

        assertEquals(PassResult.DONE, passWith(switchesBeforeCreate).run())

        assertTrue(api.created.isEmpty())
        assertTrue(api.batches.isEmpty())
        assertEquals(SYNC_PENDING, syncState("w1"))
        assertEquals(SYNC_PENDING, set("set-w1").syncState)
    }

    @Test fun `sin alumno logueado no hace nada`() = runTest {
        seed(finishedSession("w1"))
        session.session.value = Session.LoggedOut

        assertEquals(PassResult.DONE, pass.run())

        assertTrue(api.created.isEmpty())
    }
}
