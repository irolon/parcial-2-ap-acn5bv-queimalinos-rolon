package com.fittrainer.data.notifications.push

import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.data.session.Role
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

/** Tarjeta 18: el push de un mensaje pone al día el chat, no la lista de avisos. */
class PushRefresherTest {
    private val notificationsApi = FakeNotificationsApi().apply { pages = mapOf(null to page()) }
    private val messagesApi = FakeTrainerMessagesApi()
    private val refresher = PushRefresher(
        NotificationsRepository(notificationsApi, FakeNotificationDao()) { FakeStudentSession() },
        TrainerMessagesRepository(messagesApi, FakeTrainerMessagesDao(), Clock.fixed(Instant.parse("2026-11-01T13:00:00Z"), ZoneOffset.UTC)),
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

    @Test fun losDemasPushLlevanSuPropioTagYElIdFijo() {
        assertEquals(PushSlot("push:n1", 3001), pushSlot(mapOf("type" to "comment", "notification_id" to "n1")) { "x" })
        assertEquals(PushSlot("push:x", 3001), pushSlot(mapOf("type" to "message")) { "x" })
    }

    // Codex (#70 ronda 3): con la app cerrada Android lo publica con el tag del backend e id 0 (SDK de FCM);
    // con el mismo par, el aviso de primer plano y el de segundo plano se pisan.
    @Test fun elMensajeUsaElMismoParQueFcmEnSegundoPlano() {
        assertEquals(PushSlot("message:s1", 0), pushSlot(message) { "x" })
    }
}
