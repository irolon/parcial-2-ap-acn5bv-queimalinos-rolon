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

/** Tarjeta 18: el tap de un push de mensaje con cada rol. */
class LaunchResolverMessageTest {

    private class Sources : LaunchSources {
        val calls = mutableListOf<String>()
        override fun markRead(ownerId: String, id: String) {
            calls += "markRead"
        }
        override suspend fun hasHistorySession(ownerId: String, sessionId: String) = false.also { calls += "has" }
        override suspend fun isOnline() = true.also { calls += "online" }
        override suspend fun refreshHistory(ownerId: String) {
            calls += "refresh"
        }
    }

    private val trainer = Session.Trainer(AuthUser("t1", "Profe", "profe@test.com", Role.TRAINER))
    private val student = Session.Student(AuthUser("s1", "Ana", "ana@test.com", Role.STUDENT))
    private fun launch(studentId: String) = PendingLaunch(NotificationDestination.Conversation(studentId), null)

    @Test fun elAlumnoVaASuChat() = runTest {
        val sources = Sources()
        assertEquals(NavTarget.StudentChat, resolve(launch("s1"), student, sources))
        assertTrue(sources.calls.isEmpty())
    }

    @Test fun elEntrenadorVaAlChatDeEseAlumno() = runTest {
        assertEquals(NavTarget.TrainerChat("s1"), resolve(launch("s1"), trainer, Sources()))
    }

    @Test fun unMensajeDeOtraCuentaDeAlumnoSeDescarta() = runTest {
        assertEquals(NavTarget.None, resolve(launch("s2"), student, Sources()))
    }
}
