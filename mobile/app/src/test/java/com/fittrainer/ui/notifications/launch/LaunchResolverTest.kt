package com.fittrainer.ui.notifications.launch

import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.notifications.LaunchSources
import com.fittrainer.data.notifications.NotificationDestination
import com.fittrainer.data.notifications.PendingLaunch
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LaunchResolverTest {

    /** Fuentes en memoria: anota cada llamada para poder afirmar que no se tocó nada. */
    private class FakeSources(
        val saved: MutableSet<String> = mutableSetOf(),
        var online: Boolean = true,
        val onServer: Set<String> = emptySet(),
        val hangs: Boolean = false,
    ) : LaunchSources {
        val calls = mutableListOf<String>()
        override fun markRead(ownerId: String, id: String) {
            calls += "markRead:$ownerId:$id"
        }
        override suspend fun hasHistorySession(ownerId: String, sessionId: String): Boolean {
            calls += "has:$sessionId"
            return sessionId in saved
        }
        override suspend fun isOnline(): Boolean {
            calls += "online"
            return online
        }
        override suspend fun refreshHistory(ownerId: String) {
            calls += "refresh:$ownerId"
            if (hangs) awaitCancellation()
            saved += onServer
        }
    }

    private val student = Session.Student(AuthUser("u1", "Ana", "ana@test.com", Role.STUDENT))
    private val trainer = Session.Trainer(AuthUser("t1", "Profe", "profe@test.com", Role.TRAINER))
    private fun comment(id: String, notificationId: String? = null) =
        PendingLaunch(NotificationDestination.SessionDetail(id), notificationId)

    @Test fun sinSesionDeAlumnoDescartaElDestino() = runTest {
        listOf(null, Session.LoggedOut, trainer).forEach { session ->
            val sources = FakeSources(saved = mutableSetOf("s1"))
            assertEquals(NavTarget.None, resolve(comment("s1", "n1"), session, sources))
            assertTrue("sin llamadas con $session", sources.calls.isEmpty())
        }
    }

    @Test fun comentarioDeSesionGuardadaAbreElDetalle() = runTest {
        val sources = FakeSources(saved = mutableSetOf("s1"))
        assertEquals(NavTarget.HistoryDetail("s1"), resolve(comment("s1"), student, sources))
        assertTrue(sources.calls.none { it.startsWith("refresh") })
    }

    @Test fun comentarioDeSesionNoGuardadaRefrescaYAbre() = runTest {
        val sources = FakeSources(onServer = setOf("s2"))
        assertEquals(NavTarget.HistoryDetail("s2"), resolve(comment("s2"), student, sources))
        assertTrue("refresh:u1" in sources.calls)
    }

    @Test fun comentarioQueNoApareceTrasRefrescarVaAlHistorial() = runTest {
        val sources = FakeSources()
        assertEquals(NavTarget.ProgressHistory, resolve(comment("s3"), student, sources))
        assertTrue("refresh:u1" in sources.calls)
    }

    /** Revisión de Pablo: con red lenta el refresco tiene tope y se cae a Progreso → Historial. */
    @Test fun comentarioConRefrescoColgadoVaAlHistorialTrasElTope() = runTest {
        val sources = FakeSources(onServer = setOf("s2"), hangs = true)
        assertEquals(NavTarget.ProgressHistory, resolve(comment("s2"), student, sources))
        assertTrue(testScheduler.currentTime in 1..3_000)
    }

    @Test fun comentarioSinRedYSinSesionVaAlHistorial() = runTest {
        val sources = FakeSources(online = false, onServer = setOf("s2"))
        assertEquals(NavTarget.ProgressHistory, resolve(comment("s2"), student, sources))
        assertTrue(sources.calls.none { it.startsWith("refresh") })
    }

    @Test fun recordAbreGraficosConElEjercicio() = runTest {
        val launch = PendingLaunch(NotificationDestination.ExerciseChart("e1"), null)
        assertEquals(NavTarget.ProgressCharts("e1"), resolve(launch, student, FakeSources()))
    }

    @Test fun listaAbreLosAvisos() = runTest {
        val launch = PendingLaunch(NotificationDestination.NotificationsList, null)
        assertEquals(NavTarget.Notifications, resolve(launch, student, FakeSources()))
    }

    @Test fun marcaLeidoAlAbrir() = runTest {
        val sources = FakeSources(saved = mutableSetOf("s1"))
        resolve(comment("s1", "n1"), student, sources)
        assertEquals("markRead:u1:n1", sources.calls.first())
    }

    @Test fun sinIdDeAvisoNoMarcaNada() = runTest {
        val sources = FakeSources()
        resolve(PendingLaunch(NotificationDestination.NotificationsList, null), student, sources)
        assertTrue(sources.calls.none { it.startsWith("markRead") })
    }
}
