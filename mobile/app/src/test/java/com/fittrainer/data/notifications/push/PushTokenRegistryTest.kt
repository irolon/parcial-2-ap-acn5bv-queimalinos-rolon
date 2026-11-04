package com.fittrainer.data.notifications.push

import com.fittrainer.data.api.notifications.PushTokenDto
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.notifications.FakeFcmTokenSource
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PushTokenRegistryTest {

    private val api = FakeNotificationsApi()
    private val store = FakeTokenStore()
    private val source = FakeFcmTokenSource()
    private val errors = mutableListOf<String>()
    private val logger = object : PushLogger() {
        override fun failed(what: String, error: Exception) {
            errors += what
        }
    }
    private val registry = PushTokenRegistry(api, store, source, logger)

    // E12: el entrenador también recibe push (el backend toma el rol del JWT).
    @Test fun `con entrenador tambien registra el token`() = runTest {
        store.save(authState(role = Role.TRAINER))
        registry.registerIfSignedIn()
        assertEquals(listOf(PushTokenDto("fcm-token-1")), api.registered)
    }

    @Test fun `sin sesion no llama a la API`() = runTest {
        registry.registerIfSignedIn()
        registry.onNewToken("t")
        assertTrue(api.registered.isEmpty())
    }

    @Test fun `con alumno registra el token de FCM con su dueno`() = runTest {
        store.save(authState(role = Role.STUDENT))
        registry.registerIfSignedIn()
        assertEquals(listOf(PushTokenDto("fcm-token-1")), api.registered)
        assertEquals(listOf(authState().user.id), api.owners)
    }

    @Test fun `onNewTokenRegistraElNuevo`() = runTest {
        store.save(authState(role = Role.STUDENT))
        registry.onNewToken("rotado")
        assertEquals(listOf(PushTokenDto("rotado")), api.registered)
    }

    @Test fun `si falla el alta no lanza y lo loguea`() = runTest {
        store.save(authState(role = Role.STUDENT))
        api.failTokens = IOException("sin red")
        registry.registerIfSignedIn()
        assertEquals(1, errors.size)
    }

    @Test fun `si FCM no da token no lanza`() = runTest {
        store.save(authState(role = Role.STUDENT))
        source.error = IOException("SERVICE_NOT_AVAILABLE")
        registry.registerIfSignedIn()
        assertTrue(api.registered.isEmpty())
        assertEquals(1, errors.size)
    }

    @Test fun `unregister borra el token actual del alumno y lo devuelve`() = runTest {
        store.save(authState(role = Role.STUDENT))
        assertEquals("fcm-token-1", registry.unregister())
        assertEquals(listOf("fcm-token-1"), api.removed)
    }

    // #72: el logout lo manda igual, y ese sí se reintenta sin red.
    @Test fun `si el DELETE falla igual devuelve el token`() = runTest {
        store.save(authState(role = Role.STUDENT))
        api.failTokens = IOException("sin red")
        assertEquals("fcm-token-1", registry.unregister())
    }

    @Test fun `sin sesion unregister no devuelve token`() = runTest {
        assertNull(registry.unregister())
    }

    @Test fun `unregister con entrenador borra su token`() = runTest {
        store.save(authState(role = Role.TRAINER))
        registry.unregister()
        assertEquals(listOf("fcm-token-1"), api.removed)
    }

    @Test fun `si FCM no da el token a tiempo no se hace el DELETE`() = runTest {
        store.save(authState(role = Role.STUDENT))
        source.gate = CompletableDeferred()
        registry.unregister()
        assertEquals(2_000L, testScheduler.currentTime)
        assertTrue(api.removed.isEmpty())
        assertEquals(1, errors.size)
    }

    @Test fun `alumno que sale y vuelve a entrar registra dos veces`() = runTest {
        val student = Session.Student(authState(role = Role.STUDENT).user)
        store.save(authState(role = Role.STUDENT))
        registry.registerOnSessions(flowOf(student, Session.LoggedOut, student))
        assertEquals(2, api.registered.size)
    }

    @Test fun `la misma sesion repetida registra una sola vez`() = runTest {
        val student = Session.Student(authState(role = Role.STUDENT).user)
        store.save(authState(role = Role.STUDENT))
        registry.registerOnSessions(flowOf(Session.LoggedOut, student, student))
        assertEquals(1, api.registered.size)
    }

    @Test fun `entrenador que sale y vuelve a entrar registra dos veces`() = runTest {
        val trainer = Session.Trainer(authState(role = Role.TRAINER).user)
        store.save(authState(role = Role.TRAINER))
        registry.registerOnSessions(flowOf(trainer, Session.LoggedOut, trainer))
        assertEquals(2, api.registered.size)
    }

    @Test fun `unregister corta a los 5 segundos si la red no responde`() = runTest {
        store.save(authState(role = Role.STUDENT))
        val never = CompletableDeferred<Unit>()
        api.onRemove = { never.await() }
        registry.unregister()
        assertEquals(5_000L, testScheduler.currentTime)
        assertEquals(1, errors.size)
    }
}
