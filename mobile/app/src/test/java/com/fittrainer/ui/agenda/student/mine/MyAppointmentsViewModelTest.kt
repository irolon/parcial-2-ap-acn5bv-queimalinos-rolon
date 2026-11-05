package com.fittrainer.ui.agenda.student.mine

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.data.agenda.student.StudentAppointmentsRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.agenda.FakeAgendaApi
import com.fittrainer.testing.fakes.agenda.FakeStudentAgendaDao
import com.fittrainer.testing.fakes.agenda.appointmentDto
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.ui.agenda.student.MY_APPOINTMENTS_REFRESH_FAILED
import java.io.IOException
import java.time.Instant
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** «Mis turnos» (tarjeta 16): los estados de la lista, sin red y el aviso de turno pedido. */
@OptIn(ExperimentalCoroutinesApi::class)
class MyAppointmentsViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeAgendaApi().apply {
        appointments += appointmentDto("vie", "2026-11-06T21:00:00.000Z")
        appointments += appointmentDto("jue", "2026-11-05T21:00:00.000Z", status = "confirmed")
        appointments += appointmentDto("can", "2026-11-04T22:00:00.000Z", status = "cancelled")
        // Hoy 08:00 de Argentina: ya pasó.
        appointments += appointmentDto("hoy", "2026-11-04T11:00:00.000Z")
    }
    private val connectivity = FakeConnectivityObserver()
    private val clock = MutableClock(Instant.parse("2026-11-04T12:00:00Z").toEpochMilli())
    private val repo = StudentAppointmentsRepository(api, FakeStudentAgendaDao(), clock)
    private val saved = SavedStateHandle()

    private fun TestScope.started() = MyAppointmentsViewModel(repo, FakeStudentSession(), connectivity, clock, saved).also {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { it.uiState.collect {} }
        it.onStart()
        advanceUntilIdle()
    }

    @Test fun `por fecha con los cancelados al final, y solo se cancela lo que no paso`() = runTest {
        val state = started().uiState.value
        assertTrue(state.everSynced)
        assertEquals(listOf("hoy", "jue", "vie", "can"), state.items.map { it.appointment.id })
        assertEquals(
            listOf(MyAppointmentActions.PAST, MyAppointmentActions.CANCEL, MyAppointmentActions.CANCEL, MyAppointmentActions.NONE),
            state.items.map { it.actions },
        )
        assertEquals("2026-11-04" to "2027-01-03", api.weekCalls.single())
    }

    @Test fun `sin turnos muestra el vacio`() = runTest {
        api.appointments.clear()
        val state = started().uiState.value
        assertTrue(state.showEmpty)
        assertFalse(state.showLoading)
    }

    @Test fun `sin red y sin nada guardado dice que no se bajaron, con lo guardado los muestra`() = runTest {
        connectivity.state.value = false
        api.error = IOException("sin red")
        val vm = started()
        assertTrue(vm.uiState.value.showNotLoaded)
        api.error = null
        connectivity.state.value = true
        advanceUntilIdle()
        // Volvió la red: se refrescó solo.
        assertEquals(4, vm.uiState.value.items.size)
        connectivity.state.value = false
        assertTrue(vm.uiState.value.offline)
        assertEquals(4, vm.uiState.value.items.size)
    }

    @Test fun `si falla sin nada guardado muestra el error y reintentar lo baja`() = runTest {
        api.error = IOException("caido")
        val vm = started()
        assertTrue(vm.uiState.value.showError)
        api.error = null
        vm.onRetry()
        advanceUntilIdle()
        assertFalse(vm.uiState.value.showError)
        assertEquals(4, vm.uiState.value.items.size)
    }

    @Test fun `si falla con lo guardado avisa suave`() = runTest {
        val vm = started()
        api.error = IOException("caido")
        vm.onPullToRefresh()
        advanceUntilIdle()
        assertEquals(MY_APPOINTMENTS_REFRESH_FAILED, vm.uiState.value.notice)
        vm.onDismissNotice()
        assertNull(vm.uiState.value.notice)
    }

    @Test fun `el aviso de turno pedido lo pasa la ruta y se descarta`() = runTest {
        val vm = started()
        assertFalse(vm.uiState.value.requested)
        vm.onRequested()
        assertTrue(vm.uiState.value.requested)
        vm.onDismissRequested()
        assertFalse(vm.uiState.value.requested)
    }

    @Test fun `al entrar refresca cada vez, asi el push muestra el estado nuevo`() = runTest {
        val vm = started()
        api.appointments[0] = api.appointments[0].copy(status = "confirmed")
        vm.onStart()
        advanceUntilIdle()
        assertEquals(AppointmentStatus.CONFIRMED, vm.uiState.value.items.first { it.appointment.id == "vie" }.appointment.status)
        assertEquals(2, api.weekCalls.size)
    }
}
