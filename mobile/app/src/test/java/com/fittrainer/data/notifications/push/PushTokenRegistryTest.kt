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

    @Test fun `registraSoloConSesionDeAlumno`() = runTest {
        store.save(authState(role = Role.TRAINER))
        registry.registerIfStudent()
        assertTrue(api.registered.isEmpty())
    }

    @Test fun `sin sesion no llama a la API`() = runTest {
        registry.registerIfStudent()
        registry.onNewToken("t")
        assertTrue(api.registered.isEmpty())
    }

    @Test fun `con alumno registra el token de FCM con su dueno`() = runTest {
        store.save(authState(role = Role.STUDENT))
        registry.registerIfStudent()
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
        registry.registerIfStudent()
        assertEquals(1, errors.size)
    }

    @Test fun `si FCM no da token no lanza`() = runTest {
        store.save(authState(role = Role.STUDENT))
        source.error = IOException("SERVICE_NOT_AVAILABLE")
        registry.registerIfStudent()
        assertTrue(api.registered.isEmpty())
        assertEquals(1, errors.size)
    }

    @Test fun `unregister borra el token actual del alumno`() = runTest {
        store.save(authState(role = Role.STUDENT))
        registry.unregister()
        assertEquals(listOf("fcm-token-1"), api.removed)
    }

    @Test fun `unregister con entrenador no llama a la API`() = runTest {
        store.save(authState(role = Role.TRAINER))
        registry.unregister()
        assertTrue(api.removed.isEmpty())
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
        registry.registerOnStudentSessions(flowOf(student, Session.LoggedOut, student))
        assertEquals(2, api.registered.size)
    }

    @Test fun `la misma sesion repetida registra una sola vez y un entrenador nunca`() = runTest {
        val student = Session.Student(authState(role = Role.STUDENT).user)
        val trainer = Session.Trainer(authState(role = Role.TRAINER).user)
        store.save(authState(role = Role.STUDENT))
        registry.registerOnStudentSessions(flowOf(trainer, student, student))
        assertEquals(1, api.registered.size)
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
