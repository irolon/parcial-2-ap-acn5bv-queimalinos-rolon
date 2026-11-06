package com.fittrainer.ui.agenda.trainer

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.agenda.TrainerAgendaRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.agenda.FakeAgendaApi
import com.fittrainer.testing.fakes.agenda.FakeTrainerAgendaDao
import com.fittrainer.testing.fakes.agenda.appointmentDto
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import java.io.IOException
import java.time.Instant
import java.time.LocalDate
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

@OptIn(ExperimentalCoroutinesApi::class)
class AgendaViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeAgendaApi().apply {
        appointments += appointmentDto("vie", "2026-11-06T21:00:00.000Z")
        appointments += appointmentDto("mie", "2026-11-04T22:00:00.000Z", name = "Beto Paz")
        appointments += appointmentDto("can", "2026-11-05T21:00:00.000Z", status = "cancelled")
        appointments += appointmentDto("lun", "2026-11-09T13:00:00.000Z")
    }
    private val connectivity = FakeConnectivityObserver()
    private val clock = MutableClock(Instant.parse("2026-11-04T12:00:00Z").toEpochMilli())
    private val repo = TrainerAgendaRepository(api, FakeTrainerAgendaDao(), clock)

    private fun TestScope.started(saved: SavedStateHandle = SavedStateHandle()) = AgendaViewModel(repo, FakeTrainerSession(), connectivity, clock, saved).also {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { it.uiState.collect {} }
        it.onStart()
        advanceUntilIdle()
    }

    private fun AgendaUiState.ids() = days.flatMap { d -> d.appointments.map { it.id } }

    @Test fun `muestra la semana actual por dia, con la disponibilidad y sin los cancelados`() = runTest {
        val state = started().uiState.value
        assertEquals(LocalDate.parse("2026-11-02"), state.weekStart)
        assertTrue(state.everSynced)
        assertEquals(listOf("mie", "vie"), state.ids())
        assertEquals(listOf(false, false, true, false, false, false, false), state.days.map { it.isToday })
        assertEquals("09–13 · 17–21", state.days[0].availability)
        assertEquals(NO_AVAILABILITY, state.days[1].availability)
        assertEquals("2026-11-02" to "2026-11-08", api.weekCalls.single())
        assertEquals(1, api.availabilityCalls)
    }

    @Test fun `mostrar cancelados los suma y apagarlo los saca`() = runTest {
        val vm = started()
        vm.onToggleCancelled(true)
        assertEquals(listOf("mie", "can", "vie"), vm.uiState.value.ids())
        vm.onToggleCancelled(false)
        assertEquals(listOf("mie", "vie"), vm.uiState.value.ids())
    }

    @Test fun `cambiar de semana refresca esa semana y Hoy vuelve a la actual`() = runTest {
        val vm = started()
        vm.onNextWeek()
        advanceUntilIdle()
        assertEquals(LocalDate.parse("2026-11-09"), vm.uiState.value.weekStart)
        assertEquals(listOf("lun"), vm.uiState.value.ids())
        vm.onPrevWeek()
        vm.onPrevWeek()
        advanceUntilIdle()
        assertEquals(LocalDate.parse("2026-10-26"), vm.uiState.value.weekStart)
        vm.onThisWeek()
        advanceUntilIdle()
        assertEquals(listOf("mie", "vie"), vm.uiState.value.ids())
        assertEquals(listOf("2026-11-02", "2026-11-09", "2026-11-02", "2026-10-26", "2026-11-02"), api.weekCalls.map { it.first })
    }

    @Test fun `nunca hay dos pedidos a la vez para la misma semana`() = runTest {
        val gate = CompletableDeferred<Unit>()
        api.weekGate = gate
        val vm = started()
        assertTrue(vm.uiState.value.showLoading)
        vm.onPullToRefresh()
        vm.onStart()
        advanceUntilIdle()
        assertEquals(1, api.weekCalls.size)
        gate.complete(Unit)
        advanceUntilIdle()
        assertFalse(vm.uiState.value.refreshing)
    }

    @Test fun `sin red y sin cache no es error y al volver la red se baja`() = runTest {
        api.error = IOException("sin red")
        connectivity.state.value = false
        val vm = started()
        assertTrue(vm.uiState.value.showNotLoaded)
        assertFalse(vm.uiState.value.showError)
        api.error = null
        connectivity.state.value = true
        advanceUntilIdle()
        assertTrue(vm.uiState.value.everSynced)
        assertEquals(listOf("mie", "vie"), vm.uiState.value.ids())
    }

    @Test fun `sin red con cache muestra la ultima semana guardada`() = runTest {
        val vm = started()
        api.error = IOException("sin red")
        connectivity.state.value = false
        vm.onPullToRefresh()
        advanceUntilIdle()
        val state = vm.uiState.value
        assertTrue(state.offline)
        assertNull(state.notice)
        assertEquals(listOf("mie", "vie"), state.ids())
    }

    @Test fun `error sin cache ofrece reintentar`() = runTest {
        api.error = httpError(500)
        val vm = started()
        assertTrue(vm.uiState.value.showError)
        api.error = null
        vm.onRetry()
        advanceUntilIdle()
        assertFalse(vm.uiState.value.showError)
        assertTrue(vm.uiState.value.everSynced)
    }

    @Test fun `error con cache es un aviso suave que se puede cerrar`() = runTest {
        val vm = started()
        api.error = httpError(500)
        vm.onPullToRefresh()
        advanceUntilIdle()
        assertEquals(AGENDA_REFRESH_FAILED, vm.uiState.value.notice)
        assertEquals(listOf("mie", "vie"), vm.uiState.value.ids())
        vm.onDismissNotice()
        assertNull(vm.uiState.value.notice)
    }

    // #78: el aviso de un turno abre la agenda en su semana (argumento de la ruta) y la refresca.
    @Test fun `abre en la semana del argumento de la ruta`() = runTest {
        val state = started(SavedStateHandle(mapOf(AGENDA_WEEK_ARG to "2026-11-11"))).uiState.value
        assertEquals(LocalDate.parse("2026-11-09"), state.weekStart)
        assertEquals(listOf("lun"), state.ids())
        assertEquals(listOf("2026-11-09"), api.weekCalls.map { it.first })
    }

    // Con la agenda ya abierta, otro aviso la pasa a la semana de su turno.
    @Test fun `onShowWeek pasa a esa semana y la refresca`() = runTest {
        val vm = started()
        vm.onShowWeek(LocalDate.parse("2026-11-09"))
        advanceUntilIdle()
        assertEquals(LocalDate.parse("2026-11-09"), vm.uiState.value.weekStart)
        assertEquals(listOf("2026-11-02", "2026-11-09"), api.weekCalls.map { it.first })
    }
}
