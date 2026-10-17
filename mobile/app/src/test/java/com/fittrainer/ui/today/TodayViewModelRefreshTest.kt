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
import java.time.LocalDate
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response

/** Reconexión, reintentos del refresco automático y pull durante un refresco en vuelo. */
@OptIn(ExperimentalCoroutinesApi::class)
class TodayViewModelRefreshTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val monday = LocalDate.of(2026, 10, 19)
    private val clock = StepClock(monday.atTime(10, 0).toInstant(ZoneOffset.UTC))
    private val api = FakeRoutineApi() // por defecto: una rutina de los lunes
    private val connectivity = FakeConnectivityObserver(online = true)

    private fun viewModel() =
        TodayViewModel(RoutineRepository(api, FakeRoutineDao(), clock), FakeStudentSession(), connectivity, clock)

    private fun TestScope.collect(vm: TodayViewModel) =
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

    @Test fun `si vuelve la red con un refresco en vuelo se cancela y se pide de nuevo`() = runTest {
        api.gate = CompletableDeferred() // el primer pedido queda colgado en la red vieja
        val vm = viewModel()
        collect(vm)
        vm.onStart()
        assertEquals(1, api.calls)

        connectivity.state.value = false
        api.gate = null
        connectivity.state.value = true

        assertEquals(2, api.calls)
        assertTrue(vm.uiState.value.content is TodayContent.Training)
        assertFalse(vm.uiState.value.isRefreshing)
    }

    @Test fun `el automatico que falla por red con red reintenta a los 2 s y a los 5 s`() = runTest {
        api.error = IOException("dns todavia no")
        val vm = viewModel()
        collect(vm)
        vm.onStart()
        assertEquals(1, api.calls)

        advanceTimeBy(1_999)
        assertEquals(1, api.calls)
        advanceTimeBy(2)
        assertEquals(2, api.calls)

        advanceTimeBy(4_998)
        assertEquals(2, api.calls)
        api.error = null
        advanceTimeBy(2)
        assertEquals(3, api.calls)

        advanceUntilIdle()
        assertEquals(3, api.calls)
        val state = vm.uiState.value
        assertTrue(state.content is TodayContent.Training)
        assertFalse(state.isRefreshing)
        assertNull(state.notice)
    }

    @Test fun `el que ya funciona en el primer reintento no reintenta mas`() = runTest {
        api.error = IOException("dns todavia no")
        val vm = viewModel()
        collect(vm)
        vm.onStart()
        api.error = null

        advanceUntilIdle()

        assertEquals(2, api.calls)
        assertTrue(vm.uiState.value.content is TodayContent.Training)
    }

    @Test fun `los reintentos son dos como maximo y no muestran aviso`() = runTest {
        api.error = IOException("sin red de verdad")
        val vm = viewModel()
        collect(vm)
        vm.onStart()

        advanceUntilIdle()

        assertEquals(3, api.calls)
        assertNull(vm.uiState.value.notice)
        assertFalse(vm.uiState.value.isRefreshing)
    }

    @Test fun `si se corta la red mientras espera no reintenta`() = runTest {
        api.error = IOException("dns todavia no")
        val vm = viewModel()
        collect(vm)
        vm.onStart()

        connectivity.state.value = false
        advanceUntilIdle()

        assertEquals(1, api.calls)
    }

    @Test fun `un error HTTP no se reintenta`() = runTest {
        api.error = HttpException(Response.error<Any>(500, "".toResponseBody()))
        val vm = viewModel()
        collect(vm)
        vm.onStart()

        advanceUntilIdle()

        assertEquals(1, api.calls)
    }

    @Test fun `un pull mientras espera para reintentar pide ya y avisa si falla`() = runTest {
        api.error = IOException("dns todavia no")
        val vm = viewModel()
        collect(vm)
        vm.onStart()

        vm.onPullToRefresh()
        assertEquals(2, api.calls)
        assertEquals(MANUAL_REFRESH_FAILED, vm.uiState.value.notice)

        advanceUntilIdle()
        assertEquals(2, api.calls)
    }

    @Test fun `un pull durante un refresco automatico que falla muestra el aviso`() = runTest {
        val gate = CompletableDeferred<Unit>()
        api.gate = gate
        api.error = IOException("sin red")
        val vm = viewModel()
        collect(vm)

        vm.onStart()
        vm.onPullToRefresh()
        assertEquals(1, api.calls)
        assertTrue(vm.uiState.value.isRefreshing)

        gate.complete(Unit)
        advanceUntilIdle()

        assertEquals(1, api.calls)
        assertEquals(MANUAL_REFRESH_FAILED, vm.uiState.value.notice)
        assertFalse(vm.uiState.value.isRefreshing)
    }
}
