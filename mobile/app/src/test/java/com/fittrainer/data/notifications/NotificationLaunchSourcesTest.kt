package com.fittrainer.data.notifications

import com.fittrainer.data.workout.history.HistoryRepository
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.notifications.FakeNotificationDao
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import com.fittrainer.testing.fakes.notifications.notificationDto
import com.fittrainer.testing.fakes.notifications.offline
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** El leído de un push tocado (tarjeta 17, spec §3.3), sobre los repositorios con fakes. */
@OptIn(ExperimentalCoroutinesApi::class)
class NotificationLaunchSourcesTest {
    private val api = FakeNotificationsApi()
    private val dao = FakeNotificationDao()
    private val session = FakeStudentSession()
    private val notifications = NotificationsRepository(api, dao) { session }
    private val history = FakeHistoryDao()
    private val connectivity = FakeConnectivityObserver(online = true)

    private fun TestScope.sources() = RepositoryLaunchSources(
        notifications, HistoryRepository(FakeSessionApi(), history, FakeWorkoutDao()) { session }, history, connectivity, this,
    )

    @Test fun notificacionNoCacheadaConRedSubeElPatchSinRefrescar() = runTest {
        sources().markRead("u1", "n1")
        advanceUntilIdle()
        assertTrue(api.listCalls.isEmpty())
        assertEquals(listOf("n1"), api.markReadCalls)
        assertTrue(dao.pendingOf().isEmpty())
    }

    @Test fun notificacionCacheadaMarcaSinRefrescar() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("n1")))
        notifications.refresh("u1")
        sources().markRead("u1", "n1")
        advanceUntilIdle()
        assertEquals(1, api.listCalls.size)
        assertEquals(listOf("n1"), api.markReadCalls)
        assertTrue(dao.rows.value.getValue("n1").read)
    }

    @Test fun sinRedYNoCacheadaQuedaPendienteYSubeDespues() = runTest {
        connectivity.state.value = false
        api.failMarks = offline
        sources().markRead("u1", "n1")
        advanceUntilIdle()
        assertEquals(listOf("n1"), dao.pendingOf())
        assertTrue(api.markReadCalls.isEmpty())
        api.failMarks = null
        notifications.uploadPendingReads("u1")
        assertEquals(listOf("n1"), api.markReadCalls)
        assertTrue(dao.pendingOf().isEmpty())
    }
}
