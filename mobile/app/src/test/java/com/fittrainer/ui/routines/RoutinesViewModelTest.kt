package com.fittrainer.ui.routines

import com.fittrainer.data.api.MineResponse
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import com.fittrainer.testing.fakes.routine.routineDto
import java.io.IOException
import java.time.LocalDate
import java.time.ZoneOffset
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class RoutinesViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val monday = LocalDate.of(2026, 10, 19)
    private val clock = StepClock(monday.atTime(10, 0).toInstant(ZoneOffset.UTC))
    private val api = FakeRoutineApi() // por defecto: una rutina de los lunes
    private val connectivity = FakeConnectivityObserver(online = true)

    private fun viewModel() =
        RoutinesViewModel(RoutineRepository(api, FakeRoutineDao(), clock), FakeStudentSession(), connectivity, clock)

    private fun TestScope.collect(vm: RoutinesViewModel) =
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

    @Test fun `sin red y sin datos nunca sincronizo`() = runTest {
        connectivity.state.value = false
        api.error = IOException("sin red")
        val vm = viewModel()
        collect(vm)
        vm.onStart()

        assertEquals(RoutinesContent.NeverSynced, vm.uiState.value.content)
        assertTrue(vm.uiState.value.isOffline)
    }

    @Test fun `al quedar visible trae las rutinas y marca la de hoy`() = runTest {
        api.response = MineResponse(listOf(routineDto("rt-1"), routineDto("rt-2", days = listOf("friday"), createdAt = "2026-10-05T10:00:00+00:00")))
        val vm = viewModel()
        collect(vm)
        vm.onStart()

        val cards = (vm.uiState.value.content as RoutinesContent.Routines).cards
        assertEquals(listOf("rt-2", "rt-1"), cards.map { it.id })
        assertEquals(listOf("rt-1"), cards.filter { it.isToday }.map { it.id })
    }

    @Test fun `sincronizo sin rutinas`() = runTest {
        api.response = MineResponse(emptyList())
        val vm = viewModel()
        collect(vm)
        vm.onStart()

        assertEquals(RoutinesContent.Empty, vm.uiState.value.content)
    }

    @Test fun `offline con cache muestra lo guardado`() = runTest {
        val vm = viewModel()
        collect(vm)
        vm.onStart()
        connectivity.state.value = false

        assertTrue(vm.uiState.value.content is RoutinesContent.Routines)
        assertTrue(vm.uiState.value.isOffline)
    }

    @Test fun `el pull que falla avisa con el texto de Mis rutinas`() = runTest {
        val vm = viewModel()
        collect(vm)
        vm.onStart()
        api.error = IOException("caído")
        vm.onPullToRefresh()

        assertEquals(ROUTINES_REFRESH_FAILED, vm.uiState.value.notice)
    }
}
