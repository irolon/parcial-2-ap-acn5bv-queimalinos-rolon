package com.fittrainer.ui.notifications.launch

import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.notifications.LaunchSources
import com.fittrainer.data.notifications.NotificationDestination
import com.fittrainer.data.notifications.PendingLaunch
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Tarjeta 16: el tap de un push o aviso de turno con la sesión del alumno. */
class LaunchResolverAppointmentTest {

    private class Sources : LaunchSources {
        val calls = mutableListOf<String>()
        override fun markRead(ownerId: String, id: String) {
            calls += "markRead:$ownerId:$id"
        }
        override suspend fun hasHistorySession(ownerId: String, sessionId: String) = false.also { calls += "has" }
        override suspend fun isOnline() = true.also { calls += "online" }
        override suspend fun refreshHistory(ownerId: String) {
            calls += "refresh"
        }
    }

    private val student = Session.Student(AuthUser("u1", "Ana", "ana@test.com", Role.STUDENT))
    private val trainer = Session.Trainer(AuthUser("t1", "Profe", "profe@test.com", Role.TRAINER))
    private val mine = NotificationDestination.StudentAppointments

    @Test fun unTurnoAbreMisTurnosYMarcaLeido() = runTest {
        val sources = Sources()
        assertEquals(NavTarget.StudentAppointments, resolve(PendingLaunch(mine, "n7"), student, sources))
        assertEquals(listOf("markRead:u1:n7"), sources.calls)
    }

    @Test fun losTurnosDelAlumnoConSesionDeEntrenadorSeDescartanSinTocarNada() = runTest {
        val sources = Sources()
        assertEquals(NavTarget.None, resolve(PendingLaunch(mine, "n7"), trainer, sources))
        assertTrue(sources.calls.isEmpty())
    }

    @Test fun sinSesionNoSeNavega() = runTest {
        assertEquals(NavTarget.None, resolve(PendingLaunch(mine, null), null, Sources()))
    }
}
