package com.fittrainer.ui.notifications.launch

import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.notifications.LaunchSources
import com.fittrainer.data.notifications.NotificationDestination
import com.fittrainer.data.notifications.NotificationLaunchRequests
import com.fittrainer.data.notifications.PendingLaunch
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.ui.progress.ProgressOpen
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationLaunchViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    private class Sources : LaunchSources {
        val reads = mutableListOf<String>()
        override fun markRead(ownerId: String, id: String) { reads += id }
        override suspend fun hasHistorySession(ownerId: String, sessionId: String) = true
        override suspend fun isOnline() = true
        override suspend fun refreshHistory(ownerId: String) = Unit
    }

    private val requests = NotificationLaunchRequests()
    private val session = FakeStudentSession()
    private val sources = Sources()
    private val student = session.session.value
    private val chart = PendingLaunch(NotificationDestination.ExerciseChart("e1"), "n1")

    private fun vm() = NotificationLaunchViewModel(requests, session, sources)

    @Test fun sinSesionSeConsumeYNoSeRepiteTrasElLogin() = runTest {
        session.session.value = Session.LoggedOut
        val model = vm()
        requests.request(chart)
        advanceUntilIdle()
        assertNull(requests.pending.value)
        assertNull(model.target.value)
        session.session.value = student
        advanceUntilIdle()
        assertNull(model.target.value)
        assertNull(model.progressOpen.value)
        assertTrue(sources.reads.isEmpty())
    }

    @Test fun conSesionDeEntrenadorSeDescarta() = runTest {
        session.session.value = Session.Trainer(AuthUser("t1", "Profe", "p@test.com", Role.TRAINER))
        val model = vm()
        requests.request(chart)
        advanceUntilIdle()
        assertNull(requests.pending.value)
        assertNull(model.target.value)
    }

    @Test fun pushDeRecordConAlumnoNavegaYPideGraficos() = runTest {
        val model = vm()
        requests.request(chart)
        advanceUntilIdle()
        assertEquals(PendingNav(NavTarget.ProgressCharts("e1"), fromList = false), model.target.value)
        assertEquals(ProgressOpen.Charts("e1"), model.progressOpen.value)
        assertEquals(listOf("n1"), sources.reads)
        model.onProgressOpenHandled()
        model.onNavigated()
        assertNull(model.progressOpen.value)
        assertNull(model.target.value)
    }

    @Test fun desdeLaListaNoMarcaYElDetalleNoPideSolapa() = runTest {
        val model = vm()
        model.open(NotificationDestination.SessionDetail("s1"))
        advanceUntilIdle()
        assertEquals(PendingNav(NavTarget.HistoryDetail("s1"), fromList = true), model.target.value)
        assertNull(model.progressOpen.value)
        assertTrue(sources.reads.isEmpty())
    }
}
