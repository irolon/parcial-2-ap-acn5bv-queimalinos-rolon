package com.fittrainer.data.session

import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.notifications.push.PushLogger
import com.fittrainer.data.notifications.push.PushTokenRegistry
import com.fittrainer.testing.fakes.auth.FakeAuthApi
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.auth.fixedClock
import com.fittrainer.testing.fakes.notifications.FakeFcmTokenSource
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import java.io.IOException
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Cerrar sesión da de baja el token de push mientras el JWT todavía existe. */
class SignOutPushTest {

    private val notifApi = FakeNotificationsApi()
    private val store = FakeTokenStore()
    private val push = PushTokenRegistry(notifApi, store, FakeFcmTokenSource(), SilentLogger())
    private val sessions = TokenSessionRepository(
        store, AuthRepository(FakeAuthApi(), store, fixedClock()), emptySet(), push,
    )

    @Test fun `borraElTokenAntesQueElJwt`() = runTest {
        store.save(authState())
        var credentialsAtRemove: Boolean? = null
        notifApi.onRemove = { credentialsAtRemove = store.current() != null }

        sessions.signOut()

        assertEquals(listOf("fcm-token-1"), notifApi.removed)
        assertEquals(true, credentialsAtRemove)
        assertEquals(Session.LoggedOut, sessions.session.first())
    }

    @Test fun `logoutSigueSiFallaElBorradoDelToken`() = runTest {
        store.save(authState())
        notifApi.failTokens = IOException("sin red")

        assertEquals(LogoutResult.Closed, sessions.signOut())

        assertEquals(Session.LoggedOut, sessions.session.first())
        assertTrue(notifApi.removed.isEmpty())
    }

    /** El Log real no existe en los tests JVM. */
    private class SilentLogger : PushLogger() {
        override fun failed(what: String, error: Exception) = Unit
    }
}
