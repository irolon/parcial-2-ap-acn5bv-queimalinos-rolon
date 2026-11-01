package com.fittrainer.ui.notifications.bell

import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.notifications.FakeNotificationDao
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import com.fittrainer.testing.fakes.notifications.notificationDto
import com.fittrainer.testing.fakes.notifications.offline
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import java.time.Instant
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationBellViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeNotificationsApi()
    private val dao = FakeNotificationDao()
    private val session = FakeStudentSession()
    private val connectivity = FakeConnectivityObserver(online = true)
    private val clock = StepClock(Instant.parse("2026-10-30T12:00:00Z"))
    private val repository = NotificationsRepository(api, dao) { session }
    private val vm by lazy { NotificationBellViewModel(repository, session, connectivity, clock) }

    private fun serverHas(vararg ids: String) {
        api.pages = mapOf(null to api.page(*ids.map { notificationDto(it) }.toTypedArray()))
    }

    @Test fun exponeLaCantidadDeSinLeer() = runTest {
        serverHas("a", "b")
        repository.refresh("u1")
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.unread.collect {} }
        advanceUntilIdle()
        assertEquals(2, vm.unread.value)
    }

    @Test fun refrescaAlAbrirLaAppComoMuchoCada5Min() = runTest {
        serverHas("a")
        vm.onAppStart(); advanceUntilIdle()
        clock.now = clock.now.plusSeconds(4 * 60)
        vm.onAppStart(); advanceUntilIdle()
        assertEquals(1, api.listCalls.size)
        clock.now = clock.now.plusSeconds(2 * 60)
        vm.onAppStart(); advanceUntilIdle()
        assertEquals(2, api.listCalls.size)
    }

    @Test fun alCambiarDeCuentaLaCampanaRefrescaSinEsperarLos5Min() = runTest {
        serverHas("a")
        vm.onAppStart(); advanceUntilIdle()
        session.session.value = Session.Student(AuthUser("u2", "Beto", "beto@test.com", Role.STUDENT))
        advanceUntilIdle()
        clock.now = clock.now.plusSeconds(60)
        vm.onAppStart(); advanceUntilIdle()
        assertEquals(2, api.listCalls.size)
    }

    @Test fun sinRedNoRefresca() = runTest {
        connectivity.state.value = false
        serverHas("a")
        vm.onAppStart(); advanceUntilIdle()
        assertEquals(0, api.listCalls.size)
    }

    @Test fun alVolverLaRedSubeLeidosPendientes() = runTest {
        serverHas("a")
        repository.refresh("u1")
        connectivity.state.value = false
        vm.hashCode() // crea el ViewModel: el colector de conectividad arranca en su init
        api.failMarks = offline
        repository.markRead("u1", "a")
        advanceUntilIdle()
        api.failMarks = null
        connectivity.state.value = true
        advanceUntilIdle()
        assertEquals(listOf("a"), api.markReadCalls)
    }
}
