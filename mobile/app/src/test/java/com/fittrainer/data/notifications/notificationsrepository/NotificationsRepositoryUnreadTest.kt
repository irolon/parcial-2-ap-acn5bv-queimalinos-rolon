package com.fittrainer.data.notifications.notificationsrepository

import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.testing.fakes.notifications.FakeNotificationDao
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import com.fittrainer.testing.fakes.notifications.notificationDto
import com.fittrainer.testing.fakes.notifications.offline
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** No leídas más allá de la página 1 (campana) y lecturas pendientes de notificaciones que no están guardadas. */
class NotificationsRepositoryUnreadTest {
    private val api = FakeNotificationsApi()
    private val dao = FakeNotificationDao()
    private val session = FakeStudentSession()
    private val repository = NotificationsRepository(api, dao) { session }

    private fun at(day: Int, hour: Int = 6) = "2026-10-%02dT%02d:00:00+00:00".format(day, hour)
    private fun pendingIds() = dao.pendingOf()

    private fun twentyRead() = (1..20).map { notificationDto("r$it", read = true, at = at(30, it)) }.toTypedArray()

    @Test fun campanaCuentaUnaNoLeidaMasViejaQueLaPagina1() = runTest {
        api.pages = mapOf(null to api.page(*twentyRead(), next = "c1"))
        api.unreadPage = api.page(notificationDto("vieja", "comment", at = at(1)), notificationDto("ajena", "inactivity", at = at(1)))
        repository.refresh("u1")
        assertEquals(1, repository.observeUnread("u1").first())
        assertEquals(1, api.unreadCalls)
        assertEquals("c1", dao.meta("u1")!!.nextBefore) // la no leída aislada no mueve el cursor
    }

    @Test fun noLeidaAisladaSobreviveAlHuecoDelMismoRefresco() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("a", read = true, at = at(10))))
        repository.refresh("u1")
        api.pages = mapOf(null to api.page(*twentyRead(), next = "c1"))
        api.unreadPage = api.page(notificationDto("vieja", at = at(1)))
        repository.refresh("u1") // hueco: "a" se va, "vieja" queda
        assertEquals(setOf("vieja") + (1..20).map { "r$it" }, dao.rows.value.keys)
        assertEquals(1, repository.observeUnread("u1").first())
    }

    @Test fun noLeidaGuardadaQueYaNoVieneSeVeLeida() = runTest {
        api.pages = mapOf(null to api.page(*twentyRead(), next = "c1"))
        api.unreadPage = api.page(notificationDto("vieja", at = at(1)))
        repository.refresh("u1")
        api.unreadPage = api.page() // la leyó desde la web
        repository.refresh("u1")
        assertEquals(0, repository.observeUnread("u1").first())
    }

    @Test fun listaDeNoLeidasIncompletaNoMarcaNada() = runTest {
        api.pages = mapOf(null to api.page(*twentyRead(), next = "c1"))
        api.unreadPage = api.page(notificationDto("vieja", at = at(1)))
        repository.refresh("u1")
        api.unreadPage = api.page(notificationDto("otra", at = at(2)), next = "mas")
        repository.refresh("u1")
        assertEquals(2, repository.observeUnread("u1").first())
    }

    @Test fun marcarNoGuardadaConRedSubeElPatch() = runTest {
        assertTrue(repository.markRead("u1", "n9").isSuccess)
        assertEquals(listOf("n9"), api.markReadCalls)
        assertTrue(pendingIds().isEmpty())
    }

    @Test fun marcarNoGuardadaSinRedQuedaPendienteYLaFilaLlegaLeida() = runTest {
        api.failMarks = offline
        repository.markRead("u1", "n9")
        assertEquals(listOf("n9"), pendingIds())
        api.pages = mapOf(null to api.page(notificationDto("n9")))
        repository.refresh("u1")
        assertTrue(dao.rows.value.getValue("n9").read)
        assertEquals(0, repository.observeUnread("u1").first())
        api.failMarks = null
        repository.uploadPendingReads("u1")
        assertEquals(listOf("n9"), api.markReadCalls)
        assertTrue(pendingIds().isEmpty())
    }

    @Test fun marcarTodoDejaPendientesQueSobrevivenAlHueco() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("a", at = at(10))))
        repository.refresh("u1")
        api.failMarks = offline
        repository.markAllRead("u1")
        api.pages = mapOf(null to api.page(*twentyRead(), next = "c1"))
        api.unreadPage = api.page(notificationDto("a", at = at(10))) // la lectura de "a" todavía no subió
        repository.refresh("u1")
        assertTrue(dao.rows.value.getValue("a").read)
        api.failMarks = null
        repository.uploadPendingReads("u1")
        assertEquals(listOf("a"), api.markReadCalls)
        assertTrue(pendingIds().isEmpty())
    }

    @Test fun logoutBorraLasPendientesDelDueno() = runTest {
        api.failMarks = offline
        repository.markRead("u1", "n9")
        repository.clearUserData("u1")
        assertTrue(dao.pending.value.isEmpty())
    }
}
