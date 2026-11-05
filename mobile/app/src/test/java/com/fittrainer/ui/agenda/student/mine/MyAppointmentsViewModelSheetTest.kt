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
import com.fittrainer.ui.agenda.ACTION_FAILED
import com.fittrainer.ui.agenda.APPOINTMENT_GONE
import com.fittrainer.ui.agenda.student.REQUEST_OFFLINE
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

/** La hoja de un turno propio: quién la abre, la confirmación de cancelar y los errores. */
@OptIn(ExperimentalCoroutinesApi::class)
class MyAppointmentsViewModelSheetTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeAgendaApi().apply {
        appointments += appointmentDto("pen", "2026-11-06T21:00:00.000Z")
        appointments += appointmentDto("con", "2026-11-05T21:00:00.000Z", status = "confirmed")
        appointments += appointmentDto("can", "2026-11-05T22:00:00.000Z", status = "cancelled")
        appointments += appointmentDto("old", "2026-11-04T11:00:00.000Z")
    }
    private val connectivity = FakeConnectivityObserver()
    private val clock = MutableClock(Instant.parse("2026-11-04T12:00:00Z").toEpochMilli())
    private val repo = StudentAppointmentsRepository(api, FakeStudentAgendaDao(), clock)

    private fun TestScope.started() = MyAppointmentsViewModel(repo, FakeStudentSession(), connectivity, clock, SavedStateHandle()).also {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { it.uiState.collect {} }
        it.onStart()
        advanceUntilIdle()
    }

    private fun MyAppointmentsViewModel.open(id: String) = onSelect(uiState.value.items.first { it.appointment.id == id }.appointment)

    private fun MyAppointmentsViewModel.status(id: String) = uiState.value.items.first { it.appointment.id == id }.appointment.status

    @Test fun `solo lo pendiente o confirmado que no paso abre la hoja`() = runTest {
        val vm = started()
        vm.open("can")
        assertNull(vm.uiState.value.sheet)
        vm.open("old")
        assertNull(vm.uiState.value.sheet)
        vm.open("con")
        assertEquals(MyAppointmentActions.CANCEL, vm.uiState.value.sheet?.actions)
        vm.onDismissSheet()
        vm.open("pen")
        assertEquals(MyAppointmentActions.CANCEL, vm.uiState.value.sheet?.actions)
    }

    @Test fun `cancelar pide confirmacion y el cancelado pasa al final`() = runTest {
        val vm = started()
        vm.open("pen")
        vm.onCancelConfirmed()
        assertTrue(api.patchCalls.isEmpty())
        vm.onAskCancel()
        assertTrue(vm.uiState.value.sheet!!.confirmingCancel)
        vm.onBackFromCancel()
        assertFalse(vm.uiState.value.sheet!!.confirmingCancel)
        vm.onAskCancel()
        vm.onCancelConfirmed()
        advanceUntilIdle()
        assertNull(vm.uiState.value.sheet)
        assertEquals(listOf("pen" to "cancelled"), api.patchCalls)
        assertEquals(AppointmentStatus.CANCELLED, vm.status("pen"))
        assertEquals(listOf("old", "con", "can", "pen"), vm.uiState.value.items.map { it.appointment.id })
    }

    @Test fun `un 409 muestra el mensaje del backend y refresca`() = runTest {
        val vm = started()
        vm.open("pen")
        api.appointments[0] = api.appointments[0].copy(status = "cancelled")
        vm.onAskCancel()
        vm.onCancelConfirmed()
        advanceUntilIdle()
        val sheet = vm.uiState.value.sheet!!
        assertEquals("No se puede pasar el turno a ese estado", sheet.error)
        assertEquals(MyAppointmentActions.NONE, sheet.actions)
        assertEquals(2, api.weekCalls.size)
    }

    @Test fun `un 403 dice que ya no existe y lo saca de la lista`() = runTest {
        val vm = started()
        vm.open("pen")
        api.appointments.removeAll { it.id == "pen" }
        vm.onAskCancel()
        vm.onCancelConfirmed()
        advanceUntilIdle()
        assertEquals(APPOINTMENT_GONE, vm.uiState.value.sheet?.error)
        assertEquals(MyAppointmentActions.NONE, vm.uiState.value.sheet?.actions)
        assertTrue(vm.uiState.value.items.none { it.appointment.id == "pen" })
    }

    @Test fun `sin red no se manda y avisa por que`() = runTest {
        val vm = started()
        connectivity.state.value = false
        vm.open("pen")
        vm.onAskCancel()
        vm.onCancelConfirmed()
        assertEquals(REQUEST_OFFLINE, vm.uiState.value.sheet?.error)
        assertTrue(api.patchCalls.isEmpty())
    }

    @Test fun `si el pedido falla por red o por otra cosa deja reintentar`() = runTest {
        val vm = started()
        vm.open("pen")
        vm.onAskCancel()
        api.writeError = IOException("sin red")
        vm.onCancelConfirmed()
        advanceUntilIdle()
        assertEquals(REQUEST_OFFLINE, vm.uiState.value.sheet?.error)
        api.writeError = IllegalStateException("raro")
        vm.onCancelConfirmed()
        advanceUntilIdle()
        assertEquals(ACTION_FAILED, vm.uiState.value.sheet?.error)
        api.writeError = null
        vm.onCancelConfirmed()
        advanceUntilIdle()
        assertNull(vm.uiState.value.sheet)
    }
}
