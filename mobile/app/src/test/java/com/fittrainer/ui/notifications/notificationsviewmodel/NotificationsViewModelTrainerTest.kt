package com.fittrainer.ui.notifications.notificationsviewmodel

import com.fittrainer.data.api.notifications.NotificationDto
import com.fittrainer.data.notifications.NotificationDestination
import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.notifications.FakeNotificationDao
import com.fittrainer.testing.fakes.notifications.FakeNotificationPermission
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.StepClock
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.ui.notifications.NotificationsEvent
import com.fittrainer.ui.notifications.NotificationsViewModel
import com.fittrainer.ui.notifications.bell.NotificationBellViewModel
import java.time.Instant
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** E12: la lista y la campana con la sesión del entrenador. */
@OptIn(ExperimentalCoroutinesApi::class)
class NotificationsViewModelTrainerTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeNotificationsApi()
    private val dao = FakeNotificationDao()
    private val session = FakeTrainerSession()
    private val connectivity = FakeConnectivityObserver(online = true)
    private val clock = StepClock(Instant.parse("2026-10-30T12:00:00Z"))
    private val repository = NotificationsRepository(api, dao) { session }
    private val vm by lazy { NotificationsViewModel(repository, session, connectivity, FakeNotificationPermission(), clock) }

    private fun dto(id: String, type: String, vararg data: Pair<String, String>) = NotificationDto(
        id, type, "Título $id", null, JsonObject(data.associate { (k, v) -> k to JsonPrimitive(v) }), false,
        "2026-10-30T06:00:00.123456+00:00",
    )

    private val serverItems = listOf(
        dto("m", "routine_modified", "student_id" to "st1", "session_id" to "se1"),
        dto("p", "pr", "student_id" to "st2", "session_id" to "se2", "exercise_ids" to """["e1"]"""),
        dto("i", "inactivity", "student_id" to "st3"),
    )

    private fun TestScope.opened(id: String): List<NotificationsEvent> {
        val events = mutableListOf<NotificationsEvent>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.events.collect { events += it } }
        vm.onOpen(vm.uiState.value.groups.flatMap { it.second }.single { it.id == id })
        advanceUntilIdle()
        return events
    }

    private fun TestScope.loaded() {
        api.pages = mapOf(null to api.page(*serverItems.toTypedArray()))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
    }

    @Test fun elEntrenadorVeSusAvisosConSuTextoDeVacio() = runTest {
        loaded()
        assertEquals(setOf("m", "p", "i"), vm.uiState.value.groups.flatMap { it.second }.map { it.id }.toSet())
        assertTrue(vm.uiState.value.forTrainer)
    }

    @Test fun tocarUnaSustitucionAbreLaSesion() = runTest {
        loaded()
        assertEquals(listOf(NotificationsEvent.Open(NotificationDestination.StudentSession("st1", "se1"))), opened("m"))
    }

    @Test fun elRecordDeUnAlumnoAbreSuSesionYNoElGrafico() = runTest {
        loaded()
        assertEquals(listOf(NotificationsEvent.Open(NotificationDestination.StudentSession("st2", "se2"))), opened("p"))
    }

    @Test fun laInactividadAbreLaFicha() = runTest {
        loaded()
        assertEquals(listOf(NotificationsEvent.Open(NotificationDestination.StudentProfile("st3"))), opened("i"))
    }

    @Test fun laCampanaCuentaLasNoLeidasDelEntrenador() = runTest {
        api.pages = mapOf(null to api.page(*serverItems.toTypedArray()))
        val bell = NotificationBellViewModel(repository, session, connectivity, clock)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { bell.unread.collect {} }
        bell.onAppStart()
        advanceUntilIdle()
        assertEquals(3, bell.unread.value)
    }
}
