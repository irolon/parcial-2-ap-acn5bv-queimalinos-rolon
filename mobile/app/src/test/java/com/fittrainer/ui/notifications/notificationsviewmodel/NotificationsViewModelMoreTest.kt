package com.fittrainer.ui.notifications.notificationsviewmodel

import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.notifications.FakeNotificationDao
import com.fittrainer.testing.fakes.notifications.FakeNotificationPermission
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import com.fittrainer.testing.fakes.notifications.notificationDto
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import com.fittrainer.ui.notifications.NotificationsViewModel
import java.time.Instant
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** Pie de "Ver más" (carga y Reintentar), el permiso releído y la hora del "hace N min" (revisión de Pablo). */
@OptIn(ExperimentalCoroutinesApi::class)
class NotificationsViewModelMoreTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeNotificationsApi()
    private val dao = FakeNotificationDao()
    private val session = FakeStudentSession()
    private val permission = FakeNotificationPermission()
    private val clock = StepClock(Instant.parse("2026-10-30T12:00:00Z"))
    private val repository = NotificationsRepository(api, dao) { session }
    private val vm by lazy { NotificationsViewModel(repository, session, FakeConnectivityObserver(online = true), permission, clock) }

    private fun TestScope.watch() = backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

    private fun twoPages() {
        api.pages = mapOf(
            null to api.page(notificationDto("n2", at = "2026-10-30T07:00:00+00:00"), next = "c1"),
            "c1" to api.page(notificationDto("n1", at = "2026-10-30T06:00:00+00:00")),
        )
    }

    @Test fun verMasMuestraLaCargaMientrasPide() = runTest {
        twoPages()
        watch(); vm.onStart(); advanceUntilIdle()
        val gate = CompletableDeferred<Unit>().also { api.listGate = it }
        vm.onLoadMore(); advanceUntilIdle()
        assertTrue(vm.uiState.value.isLoadingMore)
        gate.complete(Unit); advanceUntilIdle()
        assertFalse(vm.uiState.value.isLoadingMore)
        assertFalse(vm.uiState.value.loadMoreFailed)
    }

    @Test fun verMasQueFallaQuedaConReintentarYReintentarLoTrae() = runTest {
        twoPages()
        watch(); vm.onStart(); advanceUntilIdle()
        api.failList = java.net.SocketTimeoutException("timeout")
        vm.onLoadMore(); advanceUntilIdle()
        assertTrue(vm.uiState.value.loadMoreFailed)
        assertFalse(vm.uiState.value.isLoadingMore)
        assertTrue(vm.uiState.value.hasMore)
        api.failList = null
        vm.onLoadMore(); advanceUntilIdle() // "Reintentar" del pie
        assertFalse(vm.uiState.value.loadMoreFailed)
        assertFalse(vm.uiState.value.hasMore)
        assertEquals(2, vm.uiState.value.groups.sumOf { it.second.size })
    }

    @Test fun unRefrescoBorraLaFallaDeVerMas() = runTest {
        twoPages()
        watch(); vm.onStart(); advanceUntilIdle()
        api.failList = java.net.SocketTimeoutException("timeout")
        vm.onLoadMore(); advanceUntilIdle()
        api.failList = null
        vm.onRefresh(); advanceUntilIdle()
        assertFalse(vm.uiState.value.loadMoreFailed)
    }

    @Test fun permisoReleidoAlVolverDelPedido() = runTest {
        permission.on = false
        watch(); vm.onStart(); advanceUntilIdle()
        assertFalse(vm.uiState.value.notificationsEnabled)
        permission.on = true
        vm.onPermissionChecked(); advanceUntilIdle()
        assertTrue(vm.uiState.value.notificationsEnabled)
    }

    @Test fun laHoraSaleDelClockInyectado() {
        assertEquals(Instant.parse("2026-10-30T12:00:00Z"), vm.now())
        clock.now = Instant.parse("2026-10-30T12:05:00Z")
        assertEquals(Instant.parse("2026-10-30T12:05:00Z"), vm.now())
    }
}
