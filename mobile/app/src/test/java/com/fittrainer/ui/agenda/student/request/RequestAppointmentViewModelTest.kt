package com.fittrainer.ui.agenda.student.request

import com.fittrainer.data.agenda.student.StudentAppointmentsRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.agenda.FakeAgendaApi
import com.fittrainer.testing.fakes.agenda.FakeStudentAgendaDao
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.ui.agenda.student.NOTE_MAX
import java.io.IOException
import java.time.Instant
import java.time.LocalDate
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

/** «Pedir turno» (tarjeta 16): los horarios por día y los estados de la pantalla. El envío está en RequestAppointmentSubmitTest. */
@OptIn(ExperimentalCoroutinesApi::class)
class RequestAppointmentViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeAgendaApi().apply {
        free += listOf("2026-11-07T13:00:00.000Z", "2026-11-06T22:00:00.000Z", "2026-11-06T21:00:00.000Z")
    }
    private val connectivity = FakeConnectivityObserver()
    private val clock = MutableClock(Instant.parse("2026-11-04T12:00:00Z").toEpochMilli())
    private val repo = StudentAppointmentsRepository(api, FakeStudentAgendaDao(), clock)

    private fun TestScope.started() = RequestAppointmentViewModel(repo, FakeStudentSession(), connectivity, clock).also {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { it.uiState.collect {} }
        it.onStart()
        advanceUntilIdle()
    }

    @Test fun `los horarios del servidor, agrupados por dia y por hora`() = runTest {
        val state = started().uiState.value
        assertEquals(listOf(LocalDate.parse("2026-11-06"), LocalDate.parse("2026-11-07")), state.days.map { it.date })
        assertEquals(listOf(Instant.parse("2026-11-06T21:00:00Z"), Instant.parse("2026-11-06T22:00:00Z")), state.days[0].slots)
        assertEquals("2026-11-04" to "2026-12-01", api.freeCalls.single())
    }

    @Test fun `un horario guardado que ya empezo no se ofrece`() = runTest {
        val vm = started()
        clock.millis = Instant.parse("2026-11-06T21:30:00Z").toEpochMilli()
        api.error = IOException("sin red")
        vm.onPullToRefresh()
        advanceUntilIdle()
        assertEquals(listOf(Instant.parse("2026-11-06T22:00:00Z")), vm.uiState.value.days[0].slots)
    }

    @Test fun `sin horarios libres muestra el vacio`() = runTest {
        api.free.clear()
        val state = started().uiState.value
        assertTrue(state.showEmpty)
        assertFalse(state.showNoTrainer)
    }

    @Test fun `un 403 dice que no tiene entrenador`() = runTest {
        api.error = httpError(403, """{"error":{"code":"FORBIDDEN","message":"No tenés permiso"}}""")
        val state = started().uiState.value
        assertTrue(state.showNoTrainer)
        assertFalse(state.showError)
        assertEquals(null, state.notice)
    }

    @Test fun `sin red y sin nada guardado dice que no se bajaron`() = runTest {
        connectivity.state.value = false
        api.error = IOException("sin red")
        val state = started().uiState.value
        assertTrue(state.showNotLoaded)
        assertTrue(state.offline)
    }

    @Test fun `si falla sin nada guardado muestra el error y reintentar los baja`() = runTest {
        api.error = IOException("caido")
        val vm = started()
        assertTrue(vm.uiState.value.showError)
        api.error = null
        vm.onRetry()
        advanceUntilIdle()
        assertEquals(2, vm.uiState.value.days.size)
    }

    @Test fun `con lo guardado y sin red se ven los horarios con el aviso`() = runTest {
        val vm = started()
        connectivity.state.value = false
        assertTrue(vm.uiState.value.offline)
        assertEquals(2, vm.uiState.value.days.size)
    }

    @Test fun `la nota tiene tope de 500 caracteres`() = runTest {
        val vm = started()
        vm.onSelectSlot(Instant.parse("2026-11-06T21:00:00Z"))
        vm.onNoteChange("x".repeat(600))
        assertEquals(NOTE_MAX, vm.note.length)
        vm.onNoteChange("Rodilla")
        assertEquals("Rodilla", vm.note)
    }
}
