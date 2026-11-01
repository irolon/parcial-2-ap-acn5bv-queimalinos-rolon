package com.fittrainer.data.notifications.notificationsrepository

import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.testing.fakes.notifications.FakeNotificationDao
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import com.fittrainer.testing.fakes.notifications.notificationDto
import com.fittrainer.testing.fakes.notifications.offline
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationsRepositoryTest {
    private val api = FakeNotificationsApi()
    private val dao = FakeNotificationDao()
    private val session = FakeStudentSession()
    private val repository = NotificationsRepository(api, dao) { session }

    private fun ids() = dao.rows.value.keys

    @Test fun refrescoGuardaSoloLosTiposDelAlumno() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("a", "comment"), notificationDto("b", "inactivity"), notificationDto("c", "pr")))
        assertTrue(repository.refresh("u1").isSuccess)
        assertEquals(setOf("a", "c"), ids())
        assertTrue(repository.everLoaded("u1").first())
    }

    @Test fun refrescoFallidoNoMarcaEverLoaded() = runTest {
        api.failList = offline
        assertTrue(repository.refresh("u1").isFailure)
        assertFalse(repository.everLoaded("u1").first())
    }

    @Test fun refrescoSaltaLaFilaConFechaRotaYGuardaLasDemas() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("a"), notificationDto("rota", at = "ayer"), notificationDto("c")))
        assertTrue(repository.refresh("u1").isSuccess)
        assertEquals(setOf("a", "c"), ids())
    }

    @Test fun refrescoNoPisaLeidoPendiente() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("n1")))
        repository.refresh("u1")
        api.failMarks = offline
        repository.markRead("u1", "n1")
        repository.refresh("u1")
        assertTrue(dao.rows.value.getValue("n1").read)
        assertEquals(listOf("n1"), dao.pendingOf())
    }

    @Test fun pedidoQueVuelaDuranteElLogoutNoEscribe() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("a")))
        val gate = CompletableDeferred<Unit>()
        api.listGate = gate
        var result: Result<Unit>? = null
        val job = launch { result = repository.refresh("u1") }
        advanceUntilIdle()
        repository.clearUserData("u1")
        gate.complete(Unit)
        job.join()
        assertTrue(result!!.isFailure)
        assertTrue(ids().isEmpty())
        assertNull(dao.meta("u1"))
    }

    @Test fun logoutBorraFilasYMetaDelDueno() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("a")))
        repository.refresh("u1")
        repository.clearUserData("u1")
        assertTrue(ids().isEmpty())
        assertNull(dao.meta("u1"))
        assertFalse(repository.everLoaded("u1").first())
    }
}
