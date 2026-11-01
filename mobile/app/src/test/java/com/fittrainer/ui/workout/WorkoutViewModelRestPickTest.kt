package com.fittrainer.ui.workout

import com.fittrainer.data.api.LibraryResponse
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.library.FakeExerciseApi
import com.fittrainer.testing.fakes.library.FakeLibraryDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import com.fittrainer.testing.fakes.workout.T0
import java.time.Instant
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

/** El alumno cambia el descanso del ejercicio en pantalla (spec §4.2 de descanso ajustable). */
@OptIn(ExperimentalCoroutinesApi::class)
class WorkoutViewModelRestPickTest {

    @get:Rule val main = MainDispatcherRule()

    private val dao = FakeWorkoutDao()
    private val clock = MutableClock(T0.toEpochMilli())
    private var next = 0
    private val repo = WorkoutRepository(dao, clock) { "id-${next++}" }
    private val library = LibraryRepository(FakeExerciseApi(LibraryResponse(emptyList())), FakeLibraryDao(), clock)
    private val vm by lazy { WorkoutViewModel(repo, library, FakeStudentSession(), FakeConnectivityObserver(), clock) }
    private val state get() = vm.uiState.value

    private suspend fun TestScope.started() {
        val e = { i: Int -> RoutineExercise("re-$i", "ex-$i", "E$i", "chest", null, null, 2, 8, 60, 40.0, null, null) }
        repo.start("u1", Routine("rt-1", "Push", null, emptySet(), Instant.EPOCH, listOf(e(0), e(1))))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
    }

    @Test fun `cambia el descanso del ejercicio en pantalla y no el de los otros`() = runTest {
        started()
        vm.onPlannedRestAdjust(15)
        vm.onPlannedRestAdjust(15)
        assertEquals(90, state.exercise?.restTotal)
        assertEquals(60, state.workout?.exercises?.single { it.position == 1 }?.restTotal)

        vm.onConfirm()
        assertEquals(90, state.workout?.rest?.totalSeconds)
    }

    @Test fun `si Room falla avisa del descanso`() = runTest {
        started()
        dao.failWrites = true
        vm.onPlannedRestAdjust(15)
        assertEquals(REST_SAVE_FAILED, state.error)
        assertEquals(60, state.exercise?.restTotal)
    }
}
