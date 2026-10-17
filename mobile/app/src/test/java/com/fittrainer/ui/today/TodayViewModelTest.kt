package com.fittrainer.ui.today

import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.routine.TodayContent
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import java.io.IOException
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class TodayViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val monday = LocalDate.of(2026, 10, 19)
    private val clock = StepClock(monday.atTime(10, 0).toInstant(ZoneOffset.UTC))
    private val api = FakeRoutineApi() // por defecto: una rutina de los lunes
    private val connectivity = FakeConnectivityObserver(online = true)

    private fun viewModel() =
        TodayViewModel(RoutineRepository(api, FakeRoutineDao(), clock), FakeStudentSession(), connectivity, clock)

    @OptIn(ExperimentalCoroutinesApi::class)
    private fun TestScope.collect(vm: TodayViewModel) =
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

    @Test fun `antes del primer sync muestra NeverSynced y el nombre`() = runTest {
        val vm = viewModel()
        collect(vm)
        assertEquals(TodayContent.NeverSynced, vm.uiState.value.content)
        assertEquals("Ana Pérez", vm.uiState.value.studentName)
        assertEquals(0, api.calls)
    }

    @Test fun `onStart refresca y muestra la rutina de hoy`() = runTest {
        val vm = viewModel()
        collect(vm)
        vm.onStart()

        val state = vm.uiState.value
        assertTrue(state.content is TodayContent.Training)
        assertFalse(state.isRefreshing)
        assertEquals(monday, state.today)
    }

    @Test fun `sin red muestra el cache con el indicador y sin aviso`() = runTest {
        val vm = viewModel()
        collect(vm)
        vm.onStart()
        connectivity.state.value = false
        api.error = IOException("sin red")
        vm.onStart()

        val state = vm.uiState.value
        assertTrue(state.isOffline)
        assertTrue(state.content is TodayContent.Training)
        assertNull(state.notice)
    }

    @Test fun `al volver la red refresca solo`() = runTest {
        connectivity.state.value = false
        val vm = viewModel()
        collect(vm)
        assertEquals(0, api.calls)

        connectivity.state.value = true

        assertEquals(1, api.calls)
        assertTrue(vm.uiState.value.content is TodayContent.Training)
    }

    @Test fun `los refrescos simultaneos se deduplican`() = runTest {
        val gate = CompletableDeferred<Unit>()
        api.gate = gate
        val vm = viewModel()
        collect(vm)

        vm.onStart()
        vm.onPullToRefresh()
        vm.onStart()
        assertTrue(vm.uiState.value.isRefreshing)
        assertEquals(1, api.calls)

        gate.complete(Unit)
        assertFalse(vm.uiState.value.isRefreshing)
    }

    @Test fun `pull to refresh fallido muestra el aviso suave y se puede cerrar`() = runTest {
        api.error = IOException("sin red")
        val vm = viewModel()
        collect(vm)

        vm.onPullToRefresh()
        assertEquals(MANUAL_REFRESH_FAILED, vm.uiState.value.notice)

        vm.dismissNotice()
        assertNull(vm.uiState.value.notice)
    }

    @Test fun `pasada la medianoche onStart recalcula el dia`() = runTest {
        val vm = viewModel()
        collect(vm)
        vm.onStart()
        assertTrue(vm.uiState.value.content is TodayContent.Training)

        clock.now = monday.plusDays(1).atTime(0, 10).toInstant(ZoneOffset.UTC)
        vm.onStart()

        val content = vm.uiState.value.content as TodayContent.Rest
        assertEquals(DayOfWeek.MONDAY, content.nextDay)
    }
}
