package com.fittrainer.data.auth.authrepository

import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.auth.logout.LogoutRetryQueue
import com.fittrainer.data.auth.logout.PendingLogout
import com.fittrainer.testing.fakes.auth.FakeAuthApi
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.auth.fixedClock
import com.fittrainer.testing.fakes.auth.httpError
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #72: el logout lleva el token de push y queda guardado hasta que llega al backend. */
class AuthRepositoryLogoutRetryTest {

    private class RecordingQueue(private val store: FakeTokenStore) : LogoutRetryQueue {
        val held = mutableListOf<PendingLogout>()
        val released = mutableListOf<String>()
        val pushRemoved = mutableListOf<Boolean>()
        var sessionAtHold: Boolean? = null
        override suspend fun hold(item: PendingLogout) {
            sessionAtHold = store.current() != null
            held += item
        }
        override suspend fun release(refreshToken: String, pushTokenRemoved: Boolean) {
            released += refreshToken
            pushRemoved += pushTokenRemoved
        }
        override suspend fun resume() = Unit
        val pending get() = held.filterNot { it.refreshToken in released }
    }

    private val api = FakeAuthApi()
    private val store = FakeTokenStore()
    private val queue = RecordingQueue(store)
    private val repo = AuthRepository(api, store, fixedClock(), queue)

    @Test fun `manda el token de push y al llegar suelta el pendiente`() = runTest {
        store.save(authState())
        repo.logout("fcm-1")
        assertEquals("fcm-1", api.logoutCalls.single().second.pushToken)
        assertEquals(listOf(PendingLogout("refresh-1", "fcm-1")), queue.held)
        assertTrue(queue.pending.isEmpty())
        assertEquals(listOf(true), queue.pushRemoved)
    }

    // Codex ronda 3: el envío directo también puede borrar el token de una sesión nueva; lo avisa al soltar.
    @Test fun `sin token de push no pide restaurar el alta`() = runTest {
        store.save(authState())
        repo.logout(null)
        assertEquals(listOf(false), queue.pushRemoved)
    }

    // Codex ronda 1, hallazgo 1: se guarda antes de cerrar la sesión y de esperar la red.
    @Test fun `guarda el pendiente antes de cerrar la sesion local`() = runTest {
        store.save(authState())
        repo.logout("fcm-1")
        assertEquals(true, queue.sessionAtHold)
    }

    @Test fun `si cancelan el logout mientras espera la red el pendiente queda guardado`() = runTest {
        store.save(authState())
        api.logoutGate = CompletableDeferred()
        val job = launch { repo.logout("fcm-1") }
        runCurrent()
        job.cancel()
        runCurrent()
        assertNull(store.current())
        assertEquals(listOf(PendingLogout("refresh-1", "fcm-1")), queue.pending)
    }

    @Test fun `sin red cierra la sesion y deja el pendiente`() = runTest {
        store.save(authState())
        api.logoutError = IOException("sin red")
        repo.logout("fcm-1")
        assertNull(store.current())
        assertEquals(listOf(PendingLogout("refresh-1", "fcm-1")), queue.pending)
    }

    @Test fun `un error del servidor deja el pendiente`() = runTest {
        store.save(authState())
        api.logoutCodes += 503
        repo.logout(null)
        assertEquals(listOf(PendingLogout("refresh-1", null)), queue.pending)
    }

    @Test fun `con 401 y el refresh rechazado deja el pendiente para mandarlo sin access`() = runTest {
        store.save(authState())
        api.logoutCodes += 401
        api.refreshError = httpError(401)
        repo.logout("fcm-1")
        assertNotNull(queue.pending.singleOrNull())
    }

    @Test fun `un 4xx que repetir no arregla suelta el pendiente`() = runTest {
        store.save(authState())
        api.logoutCodes += 400
        repo.logout("fcm-1")
        assertTrue(queue.pending.isEmpty())
    }

    @Test fun `con 401 que se resuelve renovando suelta el pendiente`() = runTest {
        store.save(authState())
        api.logoutCodes += 401
        repo.logout("fcm-1")
        assertEquals(2, api.logoutCalls.size)
        assertTrue(queue.pending.isEmpty())
    }

    @Test fun `sin sesion no guarda nada`() = runTest {
        repo.logout("fcm-1")
        assertTrue(queue.held.isEmpty())
    }
}
