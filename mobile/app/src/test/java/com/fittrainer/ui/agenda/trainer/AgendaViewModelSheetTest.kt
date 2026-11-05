package com.fittrainer.ui.agenda.trainer

import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.data.agenda.TrainerAgendaRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.agenda.FakeAgendaApi
import com.fittrainer.testing.fakes.agenda.FakeTrainerAgendaDao
import com.fittrainer.testing.fakes.agenda.appointmentDto
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import java.io.IOException
import java.time.Instant
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** La hoja de un turno: las acciones según el estado, la confirmación de cancelar y los errores. */
@OptIn(ExperimentalCoroutinesApi::class)
class AgendaViewModelSheetTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeAgendaApi().apply {
        appointments += appointmentDto("pen", "2026-11-06T21:00:00.000Z")
        appointments += appointmentDto("con", "2026-11-05T21:00:00.000Z", status = "confirmed")
        appointments += appointmentDto("old", "2026-11-03T21:00:00.000Z")
    }
    private val connectivity = FakeConnectivityObserver()
    private val clock = MutableClock(Instant.parse("2026-11-04T12:00:00Z").toEpochMilli())
    private val repo = TrainerAgendaRepository(api, FakeTrainerAgendaDao(), clock)

    private fun TestScope.started() = AgendaViewModel(repo, FakeTrainerSession(), connectivity, clock).also {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { it.uiState.collect {} }
        it.onStart()
        advanceUntilIdle()
    }

    private fun AgendaViewModel.open(id: String) {
        onSelect(uiState.value.days.flatMap { it.appointments }.first { it.id == id })
    }

    private fun AgendaViewModel.status(id: String) =
        uiState.value.days.flatMap { it.appointments }.firstOrNull { it.id == id }?.status

    @Test fun `las acciones dependen del estado y de si ya paso`() = runTest {
        val vm = started()
        vm.open("pen")
        assertEquals(AppointmentActions.CONFIRM_OR_CANCEL, vm.uiState.value.sheet?.actions)
        vm.onDismissSheet()
        vm.open("con")
        assertEquals(AppointmentActions.CANCEL, vm.uiState.value.sheet?.actions)
        vm.onDismissSheet()
        vm.open("old")
        assertEquals(AppointmentActions.PAST, vm.uiState.value.sheet?.actions)
        vm.onConfirm()
        assertTrue(api.patchCalls.isEmpty())
    }

    @Test fun `confirmar cierra la hoja y la lista muestra el estado nuevo`() = runTest {
        val vm = started()
        vm.open("pen")
        vm.onConfirm()
        advanceUntilIdle()
        assertNull(vm.uiState.value.sheet)
        assertEquals(AppointmentStatus.CONFIRMED, vm.status("pen"))
        assertEquals(listOf("pen" to "confirmed"), api.patchCalls)
    }

    @Test fun `cancelar pide confirmacion dentro de la hoja`() = runTest {
        val vm = started()
        vm.open("con")
        vm.onCancelConfirmed()
        assertTrue(api.patchCalls.isEmpty())
        vm.onAskCancel()
        assertTrue(vm.uiState.value.sheet!!.confirmingCancel)
        vm.onBackFromCancel()
        assertTrue(!vm.uiState.value.sheet!!.confirmingCancel)
        vm.onAskCancel()
        vm.onCancelConfirmed()
        advanceUntilIdle()
        assertNull(vm.uiState.value.sheet)
        // Cancelado: sale de la lista mientras "Mostrar cancelados" está apagado.
        assertNull(vm.status("con"))
        assertEquals(listOf("con" to "cancelled"), api.patchCalls)
    }

    @Test fun `un 409 muestra el mensaje del backend y refresca la semana`() = runTest {
        val vm = started()
        vm.open("pen")
        api.appointments[0] = api.appointments[0].copy(status = "cancelled")
        vm.onConfirm()
        advanceUntilIdle()
        val sheet = vm.uiState.value.sheet!!
        assertEquals("No se puede pasar el turno a ese estado", sheet.error)
        assertEquals(AppointmentStatus.CANCELLED, sheet.appointment.status)
        assertEquals(AppointmentActions.NONE, sheet.actions)
        assertEquals(2, api.weekCalls.size)
    }

    @Test fun `un 403 dice que ya no existe y saca el turno`() = runTest {
        val vm = started()
        vm.open("pen")
        api.appointments.removeAll { it.id == "pen" }
        vm.onConfirm()
        advanceUntilIdle()
        val sheet = vm.uiState.value.sheet!!
        assertEquals(APPOINTMENT_GONE, sheet.error)
        assertEquals(AppointmentActions.NONE, sheet.actions)
        assertNull(vm.status("pen"))
    }

    @Test fun `sin red no se manda y avisa por que`() = runTest {
        val vm = started()
        connectivity.state.value = false
        vm.open("pen")
        vm.onConfirm()
        assertEquals(ACTION_OFFLINE, vm.uiState.value.sheet?.error)
        assertTrue(api.patchCalls.isEmpty())
    }

    @Test fun `si el pedido falla por red tambien avisa sin red y deja reintentar`() = runTest {
        val vm = started()
        vm.open("pen")
        api.writeError = IOException("sin red")
        vm.onConfirm()
        advanceUntilIdle()
        assertEquals(ACTION_OFFLINE, vm.uiState.value.sheet?.error)
        api.writeError = null
        vm.onConfirm()
        advanceUntilIdle()
        assertNull(vm.uiState.value.sheet)
    }
}
