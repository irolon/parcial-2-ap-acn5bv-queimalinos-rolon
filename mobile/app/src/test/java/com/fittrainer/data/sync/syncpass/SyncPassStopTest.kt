package com.fittrainer.data.sync.syncpass

import com.fittrainer.data.api.CreateSessionRequest
import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.auth.RequiredUser
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.session.Session
import com.fittrainer.data.sync.PassResult
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.httpError
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

/** Cómo termina la pasada según el error (spec §5). */
class SyncPassStopTest : SyncPassTestBase() {

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
            override suspend fun create(owner: RequiredUser, body: CreateSessionRequest) {
                session.session.value = Session.LoggedOut // TokenAuthenticator borró la sesión
                throw httpError(401)
            }
        }

        assertEquals(PassResult.DONE, passWith(refreshRejected).run())

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
}
