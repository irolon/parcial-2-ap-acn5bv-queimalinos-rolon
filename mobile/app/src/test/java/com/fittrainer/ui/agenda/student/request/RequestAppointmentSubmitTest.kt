package com.fittrainer.ui.agenda.student.request

import com.fittrainer.data.agenda.student.StudentAppointmentsRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.agenda.FakeAgendaApi
import com.fittrainer.testing.fakes.agenda.FakeStudentAgendaDao
import com.fittrainer.testing.fakes.agenda.apiErrorWithMessage
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.ui.agenda.student.NO_TRAINER
import com.fittrainer.ui.agenda.student.REQUEST_FAILED
import com.fittrainer.ui.agenda.student.REQUEST_OFFLINE
import java.io.IOException
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** «Pedir turno» (tarjeta 16): mandar el pedido y cada rechazo del servidor. */
@OptIn(ExperimentalCoroutinesApi::class)
class RequestAppointmentSubmitTest {

    @get:Rule val main = MainDispatcherRule()

    private val friday = Instant.parse("2026-11-06T21:00:00Z")
    private val api = FakeAgendaApi().apply { free += listOf("2026-11-06T21:00:00.000Z", "2026-11-07T13:00:00.000Z") }
    private val connectivity = FakeConnectivityObserver()
    private val clock = MutableClock(Instant.parse("2026-11-04T12:00:00Z").toEpochMilli())
    private val repo = StudentAppointmentsRepository(api, FakeStudentAgendaDao(), clock)

    private fun TestScope.started() = RequestAppointmentViewModel(repo, FakeStudentSession(), connectivity, clock).also {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { it.uiState.collect {} }
        it.onStart()
        advanceUntilIdle()
        it.onSelectSlot(friday)
    }

    private fun RequestAppointmentViewModel.slots() = uiState.value.days.flatMap { it.slots }

    @Test fun `pedir con exito vuelve con el aviso, limpia la nota y saca el horario`() = runTest {
        val vm = started()
        vm.onNoteChange("Rodilla")
        vm.onSubmit()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.requested)
        assertNull(vm.uiState.value.sheet)
        assertEquals("", vm.note)
        assertEquals("Rodilla", api.createCalls.single().notes)
        assertEquals(listOf(Instant.parse("2026-11-07T13:00:00Z")), vm.slots())
        vm.onRequestedHandled()
        assertFalse(vm.uiState.value.requested)
    }

    @Test fun `mientras va el pedido la hoja no se cierra ni acepta otro toque`() = runTest {
        val vm = started()
        val gate = CompletableDeferred<Unit>()
        api.createGate = gate
        vm.onSubmit()
        assertTrue(vm.uiState.value.sheet!!.pending)
        vm.onDismissSheet()
        vm.onSelectSlot(Instant.parse("2026-11-07T13:00:00Z"))
        assertEquals(friday, vm.uiState.value.sheet!!.at)
        vm.onSubmit()
        gate.complete(Unit)
        advanceUntilIdle()
        assertEquals(1, api.createCalls.size)
        assertTrue(vm.uiState.value.requested)
    }

    @Test fun `SLOT_TAKEN muestra el mensaje, cierra el horario y refresca los libres`() = runTest {
        val vm = started()
        api.free.remove("2026-11-06T21:00:00.000Z")
        vm.onSubmit()
        advanceUntilIdle()
        val sheet = vm.uiState.value.sheet!!
        assertEquals("Ese horario ya está ocupado", sheet.error)
        assertTrue(sheet.closed)
        assertEquals(2, api.freeCalls.size)
        assertEquals(listOf(Instant.parse("2026-11-07T13:00:00Z")), vm.slots())
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(1, api.createCalls.size)
    }

    @Test fun `el tope de pendientes muestra el mensaje del backend`() = runTest {
        val vm = started()
        api.createError = apiErrorWithMessage(409, "APPOINTMENT_LIMIT", "Ya tenés 3 turnos pendientes: esperá a que tu entrenador los confirme")
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals("Ya tenés 3 turnos pendientes: esperá a que tu entrenador los confirme", vm.uiState.value.sheet?.error)
        assertTrue(vm.uiState.value.sheet!!.closed)
    }

    @Test fun `un 403 al pedir es sin entrenador`() = runTest {
        val vm = started()
        api.createError = httpError(403, """{"error":{"code":"FORBIDDEN","message":"No tenés permiso"}}""")
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(NO_TRAINER, vm.uiState.value.sheet?.error)
        assertTrue(vm.uiState.value.noTrainer)
    }

    @Test fun `sin red no se manda y avisa por que`() = runTest {
        val vm = started()
        connectivity.state.value = false
        vm.onSubmit()
        assertEquals(REQUEST_OFFLINE, vm.uiState.value.sheet?.error)
        assertTrue(api.createCalls.isEmpty())
    }

    @Test fun `si falla por red o por otra cosa deja reintentar con la misma nota`() = runTest {
        val vm = started()
        vm.onNoteChange("Rodilla")
        api.createError = IOException("sin red")
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(REQUEST_OFFLINE, vm.uiState.value.sheet?.error)
        api.createError = httpError(500)
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(REQUEST_FAILED, vm.uiState.value.sheet?.error)
        assertFalse(vm.uiState.value.sheet!!.closed)
        api.createError = null
        vm.onSubmit()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.requested)
        assertEquals(listOf("Rodilla", "Rodilla", "Rodilla"), api.createCalls.map { it.notes })
    }
}
