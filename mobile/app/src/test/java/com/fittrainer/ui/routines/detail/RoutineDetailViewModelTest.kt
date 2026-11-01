package com.fittrainer.ui.routines.detail

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.api.MineResponse
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.routineDto
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import com.fittrainer.testing.fakes.workout.T0
import com.fittrainer.ui.today.StartAction
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class RoutineDetailViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val clock = MutableClock(T0.toEpochMilli())
    private val api = FakeRoutineApi(MineResponse(listOf(routineDto("rt-1"), routineDto("rt-2"))))
    private val routines = RoutineRepository(api, FakeRoutineDao(), clock)
    private var next = 0
    private val workouts = WorkoutRepository(FakeWorkoutDao(), clock) { "id-${next++}" }

    private fun viewModel(id: String = "rt-1") = RoutineDetailViewModel(
        SavedStateHandle(mapOf(ROUTINE_ID_ARG to id)), routines, workouts, FakeStudentSession(), FakeConnectivityObserver(),
    )

    private fun TestScope.collect(vm: RoutineDetailViewModel) =
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

    private fun loaded(vm: RoutineDetailViewModel) = vm.uiState.value.content as RoutineDetailContent.Loaded

    @Test fun `muestra la rutina y deja empezar`() = runTest {
        routines.refresh("u1")
        val vm = viewModel()
        collect(vm)

        assertEquals("rt-1", loaded(vm).routine.id)
        assertEquals(StartAction.Start, loaded(vm).action)
    }

    @Test fun `una rutina que no esta en el cache`() = runTest {
        routines.refresh("u1")
        val vm = viewModel("rt-9")
        collect(vm)

        assertEquals(RoutineDetailContent.Missing, vm.uiState.value.content)
    }

    @Test fun `si la rutina desaparece mientras se mira pasa a no disponible`() = runTest {
        routines.refresh("u1")
        val vm = viewModel("rt-2")
        collect(vm)
        api.response = MineResponse(listOf(routineDto("rt-1")))
        routines.refresh("u1")

        assertEquals(RoutineDetailContent.Missing, vm.uiState.value.content)
    }

    @Test fun `con la sesion de esta rutina abierta se continua`() = runTest {
        routines.refresh("u1")
        val vm = viewModel()
        collect(vm)
        workouts.start("u1", loaded(vm).routine)

        assertEquals(StartAction.Continue, loaded(vm).action)
    }

    @Test fun `con la sesion de otra rutina abierta queda bloqueado`() = runTest {
        routines.refresh("u1")
        val other = viewModel("rt-2")
        collect(other)
        workouts.start("u1", loaded(other).routine)
        val vm = viewModel("rt-1")
        collect(vm)

        assertEquals(StartAction.Blocked("Rutina rt-2"), loaded(vm).action)
    }
}
