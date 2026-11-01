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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationsRepositoryPagingTest {
    private val api = FakeNotificationsApi()
    private val dao = FakeNotificationDao()
    private val session = FakeStudentSession()
    private val repository = NotificationsRepository(api, dao) { session }

    private fun ids() = dao.rows.value.keys
    private fun at(day: Int) = "2026-10-%02dT06:00:00+00:00".format(day)

    private fun twoPages() {
        api.pages = mapOf(
            null to api.page(notificationDto("a", at = at(30)), next = "c1"),
            "c1" to api.page(notificationDto("b", at = at(29))),
        )
    }

    @Test fun hasMoreSigueAlCursorGuardado() = runTest {
        twoPages()
        repository.refresh("u1")
        assertTrue(repository.hasMore("u1").first())
        repository.loadMore("u1")
        assertEquals(false, repository.hasMore("u1").first())
    }

    @Test fun loadMoreUsaNextBeforeYDevuelveSiHayMas() = runTest {
        api.pages = mapOf(
            null to api.page(notificationDto("a", at = at(30)), next = "c1"),
            "c1" to api.page(notificationDto("b", at = at(29)), next = "c2"),
            "c2" to api.page(notificationDto("c", at = at(28))),
        )
        repository.refresh("u1")
        assertEquals(true, repository.loadMore("u1").getOrNull())
        assertEquals(false, repository.loadMore("u1").getOrNull())
        assertEquals(false, repository.loadMore("u1").getOrNull()) // sin cursor no pide nada
        assertEquals(listOf(null, "c1", "c2"), api.listCalls)
        assertEquals(setOf("a", "b", "c"), ids())
    }

    @Test fun refrescoConSolapamientoConservaElCursorGuardado() = runTest {
        api.pages = mapOf(
            null to api.page(notificationDto("a", at = at(30)), next = "c1"),
            "c1" to api.page(notificationDto("b", at = at(29)), next = "c2"),
            "c2" to api.page(notificationDto("c", at = at(28)), next = "c3"),
            "c3" to api.page(notificationDto("d", at = at(27))),
        )
        repository.refresh("u1")
        repository.loadMore("u1")
        repository.loadMore("u1")
        repository.refresh("u1")
        assertEquals("c3", dao.meta("u1")!!.nextBefore) // el del tramo guardado, no el "c1" de la página 1
        repository.loadMore("u1")
        assertEquals("c3", api.listCalls.last())
        assertEquals(setOf("a", "b", "c", "d"), ids())
    }

    @Test fun huecoDeMasDeUnaPaginaReemplazaYUsaCursorDelServidor() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("a", at = at(20)), notificationDto("p", at = at(19)), next = "c1"))
        repository.refresh("u1")
        api.failMarks = com.fittrainer.testing.fakes.notifications.offline
        repository.markRead("u1", "p")
        api.pages = mapOf(null to api.page(notificationDto("x", at = at(30)), notificationDto("y", at = at(29)), next = "nuevo"))
        repository.refresh("u1")
        assertEquals(setOf("x", "y"), ids()) // lo viejo se fue; la lectura de "p" sigue en su tabla
        assertEquals(listOf("p"), dao.pendingOf())
        assertEquals("nuevo", dao.meta("u1")!!.nextBefore)
    }

    @Test fun loadMoreDescartaSiHuboLogoutMientrasBajaba() = runTest {
        twoPages()
        repository.refresh("u1")
        val gate = CompletableDeferred<Unit>()
        api.listGate = gate
        var result: Result<Boolean>? = null
        val job = launch { result = repository.loadMore("u1") }
        advanceUntilIdle()
        repository.clearUserData("u1")
        gate.complete(Unit)
        job.join()
        assertTrue(result!!.isFailure)
        assertTrue(ids().isEmpty())
        assertNull(dao.meta("u1"))
    }
}
