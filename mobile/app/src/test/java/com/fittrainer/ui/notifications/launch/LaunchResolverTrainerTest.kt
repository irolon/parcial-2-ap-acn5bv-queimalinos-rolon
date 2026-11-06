package com.fittrainer.ui.notifications.launch

import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.notifications.LaunchSources
import com.fittrainer.data.notifications.NotificationDestination
import com.fittrainer.data.notifications.PendingLaunch
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import java.time.LocalDate
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** E12: el tap de un aviso con la sesión del entrenador. */
class LaunchResolverTrainerTest {

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

    private val trainer = Session.Trainer(AuthUser("t1", "Profe", "profe@test.com", Role.TRAINER))
    private val student = Session.Student(AuthUser("u1", "Ana", "ana@test.com", Role.STUDENT))
    private val session = NotificationDestination.StudentSession("st1", "se1")

    @Test fun sustitucionAbreLaSesionYMarcaLeidoConElEntrenador() = runTest {
        val sources = Sources()
        assertEquals(NavTarget.TrainerSession("st1", "se1"), resolve(PendingLaunch(session, "n1"), trainer, sources))
        assertEquals(listOf("markRead:t1:n1"), sources.calls)
    }

    @Test fun inactividadAbreLaFicha() = runTest {
        val target = resolve(PendingLaunch(NotificationDestination.StudentProfile("st1"), null), trainer, Sources())
        assertEquals(NavTarget.TrainerStudent("st1"), target)
    }

    @Test fun unTurnoAbreLaAgendaYMarcaLeido() = runTest {
        val sources = Sources()
        val week = LocalDate.parse("2026-11-23")
        assertEquals(NavTarget.TrainerAgenda(week), resolve(PendingLaunch(NotificationDestination.Agenda(week), "n3"), trainer, sources))
        assertEquals(listOf("markRead:t1:n3"), sources.calls)
    }

    @Test fun laAgendaConSesionDeAlumnoSeDescarta() = runTest {
        assertEquals(NavTarget.None, resolve(PendingLaunch(NotificationDestination.Agenda(), "n3"), student, Sources()))
    }

    @Test fun laListaDelEntrenadorEsLaSuya() = runTest {
        val target = resolve(PendingLaunch(NotificationDestination.NotificationsList, null), trainer, Sources())
        assertEquals(NavTarget.TrainerNotifications, target)
    }

    @Test fun unDestinoDeEntrenadorConSesionDeAlumnoSeDescartaSinTocarNada() = runTest {
        val sources = Sources()
        assertEquals(NavTarget.None, resolve(PendingLaunch(session, "n1"), student, sources))
        assertEquals(NavTarget.None, resolve(PendingLaunch(NotificationDestination.StudentProfile("st1"), "n2"), student, sources))
        assertTrue(sources.calls.isEmpty())
    }

    @Test fun unDestinoDeAlumnoConSesionDeEntrenadorSeDescarta() = runTest {
        val sources = Sources()
        assertEquals(NavTarget.None, resolve(PendingLaunch(NotificationDestination.ExerciseChart("e1"), "n1"), trainer, sources))
        assertTrue(sources.calls.isEmpty())
    }
}
