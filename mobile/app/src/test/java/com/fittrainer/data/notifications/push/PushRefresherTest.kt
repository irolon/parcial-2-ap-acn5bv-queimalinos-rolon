package com.fittrainer.data.notifications.push

import com.fittrainer.data.agenda.student.StudentAppointmentsRepository
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.data.session.Role
import com.fittrainer.testing.fakes.agenda.FakeAgendaApi
import com.fittrainer.testing.fakes.agenda.FakeStudentAgendaDao
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesApi
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesDao
import com.fittrainer.testing.fakes.notifications.FakeNotificationDao
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

/** Tarjeta 18: el push de un mensaje pone al día el chat, no la lista de avisos. Tarjeta 16: el de un turno, «Mis turnos». */
class PushRefresherTest {
    private val notificationsApi = FakeNotificationsApi().apply { pages = mapOf(null to page()) }
    private val messagesApi = FakeTrainerMessagesApi()
    private val agendaApi = FakeAgendaApi()
    private val clock = Clock.fixed(Instant.parse("2026-11-01T13:00:00Z"), ZoneOffset.UTC)
    private val refresher = PushRefresher(
        NotificationsRepository(notificationsApi, FakeNotificationDao()) { FakeStudentSession() },
        TrainerMessagesRepository(messagesApi, FakeTrainerMessagesDao(), clock),
        StudentAppointmentsRepository(agendaApi, FakeStudentAgendaDao(), clock),
    )
    private val student = AuthUser("s1", "Ana", "ana@test.com", Role.STUDENT)
    private val trainer = AuthUser("t1", "Profe", "profe@test.com", Role.TRAINER)
    private val message = mapOf("type" to "message", "student_id" to "s1")

    @Test fun alAlumnoLeRefrescaSuChat() = runTest {
        refresher.onPush(student, message)
        assertEquals(1, messagesApi.historyCalls.size)
        assertEquals(0, messagesApi.conversationCalls)
        assertEquals(emptyList<String?>(), notificationsApi.listCalls)
    }

    @Test fun alEntrenadorLeRefrescaLasConversacionesYEseChat() = runTest {
        refresher.onPush(trainer, message)
        assertEquals(1, messagesApi.conversationCalls)
        assertEquals(1, messagesApi.historyCalls.size)
        assertEquals(emptyList<String?>(), notificationsApi.listCalls)
    }

    @Test fun sinAlumnoElEntrenadorSoloRefrescaLasConversaciones() = runTest {
        refresher.onPush(trainer, mapOf("type" to "message"))
        assertEquals(1, messagesApi.conversationCalls)
        assertEquals(0, messagesApi.historyCalls.size)
    }

    @Test fun losDemasPushRefrescanLaListaDeAvisos() = runTest {
        refresher.onPush(student, mapOf("type" to "comment", "notification_id" to "n1"))
        assertEquals(listOf<String?>(null), notificationsApi.listCalls)
        assertEquals(0, messagesApi.historyCalls.size)
    }

    @Test fun elPushDeUnTurnoAlAlumnoRefrescaSusTurnosYLosAvisos() = runTest {
        refresher.onPush(student, mapOf("type" to "appointment", "notification_id" to "n2"))
        assertEquals(listOf<String?>(null), notificationsApi.listCalls)
        assertEquals(1, agendaApi.weekCalls.size)
    }

    @Test fun alEntrenadorUnTurnoNoLeTocaLosDelAlumno() = runTest {
        refresher.onPush(trainer, mapOf("type" to "appointment", "notification_id" to "n2"))
        assertEquals(0, agendaApi.weekCalls.size)
    }

    @Test fun losMensajesDeUnaConversacionCompartenLaNotificacion() {
        assertEquals("message:s1", pushTag(message) { "x" })
        assertEquals("n1", pushTag(mapOf("type" to "comment", "notification_id" to "n1")) { "x" })
        assertEquals("x", pushTag(mapOf("type" to "message")) { "x" })
    }
}
