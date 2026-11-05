package com.fittrainer.data.auth.logout

import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.notifications.push.PushLogger
import com.fittrainer.data.notifications.push.PushTokenRegistry
import com.fittrainer.testing.fakes.auth.FakeAuthApi
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.auth.fixedClock
import com.fittrainer.testing.fakes.auth.logout.MemoryPendingLogoutDataStore
import com.fittrainer.testing.fakes.notifications.FakeFcmTokenSource
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Codex ronda 3: el logout directo espera la red, mientras tanto la misma cuenta vuelve a entrar (y registra el token
 * de FCM) y recién después llega la baja. La sesión nueva no puede quedar sin push, aunque el primer alta falle.
 */
class LogoutReloginTest {

    private class SilentPushLogger : PushLogger() {
        override fun failed(what: String, error: Exception) = Unit
    }

    private class SilentRetryLogger : LogoutRetryLogger() {
        override fun failed(what: String, error: Exception) = Unit
    }

    private class CountingScheduler : LogoutRetryScheduler {
        var calls = 0
        override suspend fun schedule() {
            calls++
        }
    }

    private val authApi = FakeAuthApi()
    private val notifApi = FakeNotificationsApi()
    private val session = FakeTokenStore()
    private val store = PendingLogoutStore(MemoryPendingLogoutDataStore())
    private val scheduler = CountingScheduler()
    private val repo = AuthRepository(authApi, session, fixedClock(), PendingLogoutQueue(store, scheduler, SilentRetryLogger()))
    private val registry = PushTokenRegistry(notifApi, session, FakeFcmTokenSource(), SilentPushLogger())
    private val pass = LogoutRetryPass(authApi, store, registry)

    @Test fun `la baja tardia del logout directo no deja a la sesion nueva sin push`() = runTest {
        session.save(authState())
        val network = CompletableDeferred<Unit>()
        authApi.logoutGate = network
        val logout = launch { repo.logout("fcm-token-1") }
        runCurrent()

        // Vuelve a entrar mientras el logout espera la red: su alta registra el mismo token.
        session.save(authState())
        registry.registerIfSignedIn()
        // Llega la baja tardía.
        network.complete(Unit)
        logout.join()
        assertTrue(store.all().isEmpty())
        assertTrue(store.needsReregister())

        // La pasada que confirma el alta: la primera falla (503) y pide reintento; la siguiente lo registra.
        notifApi.failTokens = IOException("503")
        assertFalse(pass.run())
        assertTrue(store.needsReregister())
        notifApi.failTokens = null
        assertTrue(pass.run())
        assertFalse(store.needsReregister())
        assertEquals(listOf("fcm-token-1", "fcm-token-1"), notifApi.registered.map { it.token })
        assertTrue(scheduler.calls >= 2)
    }
}
