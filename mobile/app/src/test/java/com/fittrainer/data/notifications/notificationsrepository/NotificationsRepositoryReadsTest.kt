package com.fittrainer.data.notifications.notificationsrepository

import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import com.fittrainer.testing.fakes.notifications.FakeNotificationDao
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import com.fittrainer.testing.fakes.notifications.notificationDto
import com.fittrainer.testing.fakes.notifications.offline
import com.fittrainer.testing.fakes.progress.httpErrorWithCode
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.httpError
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationsRepositoryReadsTest {
    private val api = FakeNotificationsApi()
    private val dao = FakeNotificationDao()
    private val session = FakeStudentSession()
    private val repository = NotificationsRepository(api, dao) { session }

    private fun row(id: String) = dao.rows.value.getValue(id)
    private fun pending(id: String) = id in dao.pendingOf()

    private suspend fun loadTwo() {
        api.pages = mapOf(null to api.page(notificationDto("n1"), notificationDto("n2")))
        repository.refresh("u1")
    }

    @Test fun marcarLeidoSinRedQuedaPendienteYSubeDespues() = runTest {
        loadTwo()
        api.failMarks = offline
        assertTrue(repository.markRead("u1", "n1").isSuccess)
        assertTrue(pending("n1"))
        api.failMarks = null
        assertTrue(repository.uploadPendingReads("u1").isSuccess)
        assertEquals(listOf("n1"), api.markReadCalls)
        assertFalse(pending("n1"))
    }

    @Test fun laSubidaSaleConElDuenoRequerido() = runTest {
        loadTwo()
        repository.markRead("u1", "n1")
        repository.markAllRead("u1")
        assertEquals(listOf("u1", "u1"), api.owners)
    }

    @Test fun marcarLeido404ConCodigoSeDescarta() = runTest {
        loadTwo()
        api.failMarks = httpErrorWithCode(404, "NOTIFICATION_NOT_FOUND")
        assertTrue(repository.markRead("u1", "n1").isSuccess)
        assertFalse(pending("n1"))
    }

    @Test fun marcarLeido404SinCodigoSigueDePendiente() = runTest {
        loadTwo()
        api.failMarks = httpError(404)
        assertTrue(repository.markRead("u1", "n1").isSuccess)
        assertTrue(pending("n1"))
    }

    @Test fun subirConErrorDelServidorDevuelveFalloYSigueDePendiente() = runTest {
        loadTwo()
        api.failMarks = httpError(500)
        repository.markRead("u1", "n1")
        val error = (repository.uploadPendingReads("u1").exceptionOrNull() as DataException).error
        assertEquals(DataError.Http(500), error)
        assertTrue(pending("n1"))
    }

    @Test fun marcarTodoLeidoSubeReadAll() = runTest {
        loadTwo()
        api.failMarks = offline
        assertTrue(repository.markAllRead("u1").isSuccess)
        assertTrue(dao.rows.value.values.all { it.read })
        assertTrue(dao.meta("u1")!!.allReadPending)
        api.failMarks = null
        repository.uploadPendingReads("u1")
        assertEquals(1, api.markAllCalls)
        assertTrue(api.markReadCalls.isEmpty())
        assertFalse(dao.meta("u1")!!.allReadPending)
        assertTrue(dao.pendingOf().isEmpty())
    }

    @Test fun marcarTodoConUnaMarcaIndividualPrevia() = runTest {
        loadTwo()
        api.failMarks = offline
        repository.markRead("u1", "n1")
        repository.markAllRead("u1")
        api.failMarks = null
        repository.uploadPendingReads("u1")
        assertEquals(1, api.markAllCalls)
        assertTrue(api.markReadCalls.isEmpty())
        assertTrue(dao.pendingOf().isEmpty())
    }

    @Test fun marcarTodoDeOtraCuentaNoDejaPendiente() = runTest {
        loadTwo()
        session.session.value = Session.Student(AuthUser("u2", "Beto", "b@test.com", Role.STUDENT))
        assertTrue(repository.markAllRead("u1").isFailure)
        assertFalse(dao.meta("u1")?.allReadPending == true)
        assertEquals(0, api.markAllCalls)
    }
}
