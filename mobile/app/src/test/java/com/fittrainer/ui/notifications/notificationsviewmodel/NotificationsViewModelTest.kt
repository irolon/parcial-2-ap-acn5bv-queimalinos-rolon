package com.fittrainer.ui.notifications.notificationsviewmodel

import com.fittrainer.data.api.notifications.NotificationDto
import com.fittrainer.data.notifications.NotificationDestination
import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.notifications.FakeNotificationDao
import com.fittrainer.testing.fakes.notifications.FakeNotificationPermission
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import com.fittrainer.testing.fakes.notifications.notificationDto
import com.fittrainer.testing.fakes.notifications.offline
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import com.fittrainer.ui.notifications.NotificationsEvent
import com.fittrainer.ui.notifications.NotificationsViewModel
import java.time.Instant
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationsViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeNotificationsApi()
    private val dao = FakeNotificationDao()
    private val session = FakeStudentSession()
    private val connectivity = FakeConnectivityObserver(online = true)
    private val permission = FakeNotificationPermission()
    private val repository = NotificationsRepository(api, dao) { session }
    private val vm by lazy {
        NotificationsViewModel(repository, session, connectivity, permission, StepClock(Instant.parse("2026-10-30T12:00:00Z")))
    }

    private fun TestScope.watch() = backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

    private fun servidorCon(vararg items: NotificationDto) {
        api.pages = mapOf(null to api.page(*items))
    }

    private fun total() = vm.uiState.value.groups.sumOf { it.second.size }

    @Test fun sinRedYNuncaCargoPideConectarse() = runTest {
        connectivity.state.value = false
        api.failList = offline
        watch(); vm.onStart(); advanceUntilIdle()
        val s = vm.uiState.value
        assertTrue(s.isOffline)
        assertFalse(s.everLoaded)
        assertFalse(s.refreshFailed)
        assertTrue(s.groups.isEmpty())
    }

    @Test fun timeoutConRedMuestraReintentarAunqueNuncaHayaCargado() = runTest {
        api.failList = java.net.SocketTimeoutException("timeout")
        watch(); vm.onStart(); advanceUntilIdle()
        val s = vm.uiState.value
        assertFalse(s.isOffline)
        assertTrue(s.refreshFailed)
        assertFalse(s.everLoaded)
    }

    @Test fun pullDuranteUnaCargaDeMasPaginasRefresca() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("n2"), next = "c1"), "c1" to api.page(notificationDto("n1")))
        watch(); vm.onStart(); advanceUntilIdle()
        val gate = kotlinx.coroutines.CompletableDeferred<Unit>()
        api.listGate = gate
        vm.onLoadMore(); advanceUntilIdle()
        val before = api.listCalls.size
        vm.onRefresh(); advanceUntilIdle()
        gate.complete(Unit); advanceUntilIdle()
        assertEquals(before + 1, api.listCalls.size)
        assertEquals(null, api.listCalls.last())
        assertFalse(vm.uiState.value.isRefreshing)
    }

    @Test fun sinRedConGuardadosMuestraGuardados() = runTest {
        servidorCon(notificationDto("n1"), notificationDto("n2", read = true))
        repository.refresh("u1")
        connectivity.state.value = false
        api.failList = offline
        watch(); vm.onStart(); advanceUntilIdle()
        val s = vm.uiState.value
        assertTrue(s.isOffline)
        assertTrue(s.everLoaded)
        assertFalse(s.refreshFailed)
        assertEquals(2, total())
    }

    @Test fun falloElRefrescoMuestraReintentar() = runTest {
        servidorCon(notificationDto("n1"))
        repository.refresh("u1")
        api.failList = RuntimeException("500")
        watch(); vm.onStart(); advanceUntilIdle()
        assertTrue(vm.uiState.value.refreshFailed)
        assertFalse(vm.uiState.value.isRefreshing)
        assertEquals(1, total())
        api.failList = null
        vm.onRefresh(); advanceUntilIdle()
        assertFalse(vm.uiState.value.refreshFailed)
    }

    @Test fun abrirMarcaLeidoYEmiteDestino() = runTest {
        val data = JsonObject(mapOf("session_id" to JsonPrimitive("s1")))
        servidorCon(NotificationDto("n1", "comment", "Comentó", null, data, false, "2026-10-30T06:00:00+00:00"))
        watch(); vm.onStart(); advanceUntilIdle()
        val events = mutableListOf<NotificationsEvent>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.events.collect { events += it } }
        vm.onOpen(vm.uiState.value.groups.first().second.first()); advanceUntilIdle()
        assertEquals(listOf<NotificationsEvent>(NotificationsEvent.Open(NotificationDestination.SessionDetail("s1"))), events)
        assertTrue(dao.rows.value.getValue("n1").read)
        assertEquals(listOf("n1"), api.markReadCalls)
    }

    @Test fun abrirNavegaAunqueLaSubidaNuncaTermine() = runTest {
        servidorCon(notificationDto("n1"))
        watch(); vm.onStart(); advanceUntilIdle()
        api.markGate = CompletableDeferred()
        val events = mutableListOf<NotificationsEvent>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.events.collect { events += it } }
        vm.onOpen(vm.uiState.value.groups.first().second.first()); advanceUntilIdle()
        assertEquals(1, events.size)
        assertTrue(dao.rows.value.getValue("n1").read)
        assertEquals(emptyList<String>(), api.markReadCalls)
    }

    @Test fun dobleToqueAbreUnaSolaVez() = runTest {
        // Main "de verdad": la corrutina del primer toque no corre hasta que llega el segundo.
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        servidorCon(notificationDto("n1"))
        watch(); vm.onStart(); advanceUntilIdle()
        val events = mutableListOf<NotificationsEvent>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.events.collect { events += it } }
        val item = vm.uiState.value.groups.first().second.first()
        vm.onOpen(item); vm.onOpen(item); advanceUntilIdle()
        assertEquals(1, events.size)
    }

    @Test fun abrirUnoYaLeidoNoVuelveAMarcar() = runTest {
        servidorCon(notificationDto("n1", read = true))
        watch(); vm.onStart(); advanceUntilIdle()
        vm.onOpen(vm.uiState.value.groups.first().second.first()); advanceUntilIdle()
        assertEquals(emptyList<String>(), api.markReadCalls)
    }

    @Test fun marcarTodoSoloSiHayNoLeidos() = runTest {
        servidorCon(notificationDto("n1", read = true))
        watch(); vm.onStart(); advanceUntilIdle()
        assertFalse(vm.uiState.value.hasUnread)
        servidorCon(notificationDto("n1", read = true), notificationDto("n2"))
        vm.onRefresh(); advanceUntilIdle()
        assertTrue(vm.uiState.value.hasUnread)
        vm.onMarkAllRead(); advanceUntilIdle()
        assertFalse(vm.uiState.value.hasUnread)
        assertEquals(listOf("n2"), api.markReadCalls) // solo la no leída, con su PATCH
    }

    @Test fun permisoApagadoMuestraCartel() = runTest {
        permission.on = false
        watch(); vm.onStart(); advanceUntilIdle()
        assertFalse(vm.uiState.value.notificationsEnabled)
        permission.on = true
        vm.onStart(); advanceUntilIdle()
        assertTrue(vm.uiState.value.notificationsEnabled)
    }

    @Test fun conMasPaginasCargaLaSiguienteAlLlegarAlFinal() = runTest {
        api.pages = mapOf(
            null to api.page(notificationDto("n2", at = "2026-10-30T07:00:00+00:00"), next = "c1"),
            "c1" to api.page(notificationDto("n1", at = "2026-10-30T06:00:00+00:00")),
        )
        watch(); vm.onStart(); advanceUntilIdle()
        assertTrue(vm.uiState.value.hasMore)
        vm.onLoadMore(); advanceUntilIdle()
        assertFalse(vm.uiState.value.hasMore)
        assertEquals(2, total())
    }
}
