package com.fittrainer.data.notifications.notificationsrepository

import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.testing.fakes.notifications.FakeNotificationDao
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import com.fittrainer.testing.fakes.notifications.notificationDto
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Carreras entre GET y PATCH (Codex rondas 2 y 3): todo lo de red va en serie detrás de un candado. */
@OptIn(ExperimentalCoroutinesApi::class)
class NotificationsRepositoryRaceTest {
    private val api = FakeNotificationsApi()
    private val dao = FakeNotificationDao()
    private val session = FakeStudentSession()
    private val repository = NotificationsRepository(api, dao) { session }

    private fun read(id: String) = dao.rows.value.getValue(id).read
    private suspend fun bell() = repository.observeUnread("u1").first()
    private fun gate() = CompletableDeferred<Unit>().also { api.listGates.add(it) }
    private val later = "2026-10-31T06:00:00+00:00"

    /** Ronda 2: el GET viejo trae n9 sin leer; el PATCH del push espera a que aplique y n9 queda leída. */
    @Test fun patchEsperaAlGetEnVueloYLaNotificacionQuedaLeida() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("n9")))
        api.unreadPage = api.page(notificationDto("n9"))
        val gate = gate()
        val refresh = launch { repository.refresh("u1") }
        advanceUntilIdle()
        val mark = launch { repository.markRead("u1", "n9") } // push tocado, n9 no guardada
        advanceUntilIdle()
        assertTrue(api.markReadCalls.isEmpty()) // el PATCH espera el candado
        assertEquals(listOf("n9"), dao.pendingOf())
        gate.complete(Unit)
        refresh.join()
        mark.join()
        assertTrue(read("n9"))
        assertEquals(0, bell())
        assertEquals(listOf("n9"), api.markReadCalls)
        assertTrue(dao.pendingOf().isEmpty())
        api.pages = mapOf(null to api.page(notificationDto("n9", read = true)))
        api.unreadPage = api.page()
        repository.refresh("u1")
        assertTrue(read("n9"))
        assertEquals(listOf("n9"), api.markReadCalls) // no se reenvía
    }

    /** Ronda 3 (1): "Ver más" lento + PATCH + refresco: n9 nunca vuelve a quedar sin leer. */
    @Test fun verMasLentoConPatchYRefrescoDejaLeida() = runTest {
        api.pages = mapOf(
            null to api.page(notificationDto("a", read = true, at = later), next = "c1"),
            "c1" to api.page(notificationDto("n9")),
        )
        api.unreadPage = api.page(notificationDto("n9"))
        repository.refresh("u1")
        val gate = gate()
        val more = launch { repository.loadMore("u1") }
        advanceUntilIdle()
        val mark = launch { repository.markRead("u1", "n9") }
        api.pages = api.pages + (null to api.page(notificationDto("a", read = true, at = later), notificationDto("n9", read = true)))
        api.unreadPage = api.page()
        val refresh = launch { repository.refresh("u1") }
        advanceUntilIdle()
        gate.complete(Unit)
        more.join()
        mark.join()
        refresh.join()
        assertTrue(read("n9"))
        assertEquals(0, bell())
        assertEquals(listOf("n9"), api.markReadCalls)
        assertTrue(dao.pendingOf().isEmpty())
    }

    /** Ronda 3 (2): la que llega después del read-all queda sin leer (no hereda la marca de un pedido viejo). */
    @Test fun notificacionPosteriorAlReadAllQuedaSinLeer() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("a")))
        api.unreadPage = api.page(notificationDto("a"))
        val gate = gate()
        val refresh = launch { repository.refresh("u1") }
        advanceUntilIdle()
        val all = launch { repository.markAllRead("u1") }
        advanceUntilIdle()
        assertEquals(0, api.markAllCalls) // espera el candado
        gate.complete(Unit)
        refresh.join()
        all.join()
        assertEquals(1, api.markAllCalls)
        assertTrue(read("a"))
        // Llega m1 después del PATCH: el refresco siguiente la guarda sin leer.
        api.pages = mapOf(null to api.page(notificationDto("m1", at = later), notificationDto("a", read = true)))
        api.unreadPage = api.page(notificationDto("m1", at = later))
        repository.refresh("u1")
        assertTrue(!read("m1"))
        assertEquals(1, bell())
        assertTrue(dao.pendingOf().isEmpty())
    }

    /** Si m1 ya existía cuando salió el read-all (bajó antes del PATCH), el servidor la marcó leída: acá también. */
    @Test fun notificacionAnteriorAlReadAllQuedaLeidaComoEnElServidor() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("a")))
        val gate = gate()
        val refresh = launch { repository.refresh("u1") }
        advanceUntilIdle()
        val all = launch { repository.markAllRead("u1") }
        advanceUntilIdle()
        api.unreadPage = api.page(notificationDto("a"), notificationDto("m1", at = later)) // aparece antes de unread_only
        gate.complete(Unit)
        refresh.join()
        all.join()
        assertEquals(1, api.markAllCalls)
        assertTrue(read("m1"))
        assertEquals(0, bell())
    }
}
