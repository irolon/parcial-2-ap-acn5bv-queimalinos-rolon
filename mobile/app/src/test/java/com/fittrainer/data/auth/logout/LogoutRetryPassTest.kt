package com.fittrainer.data.auth.logout

import com.fittrainer.data.api.LogoutRequest
import com.fittrainer.data.notifications.push.PushLogger
import com.fittrainer.data.notifications.push.PushTokenRegistry
import com.fittrainer.testing.fakes.auth.FakeAuthApi
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.auth.logout.MemoryPendingLogoutDataStore
import com.fittrainer.testing.fakes.notifications.FakeFcmTokenSource
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LogoutRetryPassTest {
    private val api = FakeAuthApi()
    private val dataStore = MemoryPendingLogoutDataStore()
    private val store = PendingLogoutStore(dataStore)
    private val notifApi = FakeNotificationsApi()
    private val session = FakeTokenStore()
    private val registry = PushTokenRegistry(notifApi, session, FakeFcmTokenSource(), SilentLogger())
    private val pass = LogoutRetryPass(api, store, registry)

    @Test fun `manda cada pendiente sin access token y los saca`() = runTest {
        store.add(PendingLogout("r1", "fcm-1"))
        store.add(PendingLogout("r2"))
        assertTrue(pass.run())
        assertEquals(listOf(null to LogoutRequest("r1", "fcm-1"), null to LogoutRequest("r2")), api.logoutCalls)
        assertTrue(store.all().isEmpty())
    }

    @Test fun `un error del servidor deja ese pendiente y pide reintento`() = runTest {
        store.add(PendingLogout("r1"))
        store.add(PendingLogout("r2"))
        api.logoutCodes += 500
        assertFalse(pass.run())
        assertEquals(listOf(PendingLogout("r1")), store.all())
    }

    @Test fun `sin red no saca nada`() = runTest {
        store.add(PendingLogout("r1"))
        api.logoutError = IOException("sin red")
        assertFalse(pass.run())
        assertEquals(listOf(PendingLogout("r1")), store.all())
    }

    @Test fun `un 4xx da el logout por terminado`() = runTest {
        store.add(PendingLogout("r1"))
        api.logoutCodes += 400
        assertTrue(pass.run())
        assertTrue(store.all().isEmpty())
    }

    @Test fun `lo que se suma durante la pasada queda para la proxima`() = runTest {
        store.add(PendingLogout("r1"))
        dataStore.onUpdate = {
            // El remove de la pasada encuentra un logout nuevo que la pasada no leyó.
            dataStore.value.value = dataStore.value.value.copy(items = dataStore.value.value.items + PendingLogout("r9"))
            dataStore.onUpdate = null
        }
        pass.run()
        assertEquals(listOf(PendingLogout("r9")), store.all())
    }

    // Codex ronda 1, hallazgo 2: volvió a entrar antes del reintento; la baja no le puede dejar la sesión sin push.
    @Test fun `si alguien volvio a entrar le registra de nuevo el token despues de la baja`() = runTest {
        store.add(PendingLogout("r1", "fcm-token-1"))
        session.save(authState())
        val order = mutableListOf<String>()
        api.onLogout = { order += "baja" }
        notifApi.onRegister = { order += "alta" }
        pass.run()
        assertEquals(listOf("baja", "alta"), order)
        assertEquals(listOf("fcm-token-1"), notifApi.registered.map { it.token })
    }

    @Test fun `sin sesion o sin token de push no registra nada`() = runTest {
        store.add(PendingLogout("r1", "fcm-token-1"))
        pass.run()
        session.save(authState())
        store.add(PendingLogout("r2"))
        pass.run()
        assertTrue(notifApi.registered.isEmpty())
        assertFalse(store.needsReregister())
    }

    // Codex ronda 2, hallazgo 2: si el alta falla, queda anotada y la pasada pide reintento.
    @Test fun `si el alta falla despues de la baja queda pendiente y se reintenta`() = runTest {
        store.add(PendingLogout("r1", "fcm-token-1"))
        session.save(authState())
        notifApi.failTokens = IOException("503")

        assertFalse(pass.run())
        assertTrue(store.all().isEmpty())
        assertTrue(store.needsReregister())

        notifApi.failTokens = null
        assertTrue(pass.run())
        assertEquals(listOf("fcm-token-1"), notifApi.registered.map { it.token })
        assertFalse(store.needsReregister())
    }

    @Test fun `si cancelan la pasada despues de la baja el alta queda anotada`() = runTest {
        store.add(PendingLogout("r1", "fcm-token-1"))
        session.save(authState())
        notifApi.onRegister = { awaitCancellation() }
        val job = launch { pass.run() }
        runCurrent()
        job.cancel()
        runCurrent()
        assertTrue(store.all().isEmpty())
        assertTrue(store.needsReregister())
    }

    // Codex ronda 4: una baja del logout directo mientras el alta está en vuelo no se pierde.
    @Test fun `una baja que llega con el alta en vuelo queda para la proxima pasada`() = runTest {
        store.add(PendingLogout("r1", "fcm-token-1"))
        session.save(authState())
        val response = CompletableDeferred<Unit>()
        notifApi.onRegister = { response.await() }
        val running = async { pass.run() }
        runCurrent()

        // El logout directo de otra sesión: hold y, al llegar su baja, release con el token borrado.
        store.add(PendingLogout("r2", "fcm-token-1"))
        store.remove(setOf("r2"), reregister = true)
        response.complete(Unit)

        assertFalse(running.await())
        assertTrue(store.needsReregister())
        notifApi.onRegister = {}
        assertTrue(pass.run())
        assertFalse(store.needsReregister())
    }

    /** El Log real no existe en los tests JVM. */
    private class SilentLogger : PushLogger() {
        override fun failed(what: String, error: Exception) = Unit
    }
}
