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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** Si Room falla con el timer en pantalla, el error es del descanso y el descanso queda como estaba. */
@OptIn(ExperimentalCoroutinesApi::class)
class WorkoutViewModelRestErrorTest {

    @get:Rule val main = MainDispatcherRule()

    private val dao = FakeWorkoutDao()
    private val clock = MutableClock(T0.toEpochMilli())
    private var next = 0
    private val repo = WorkoutRepository(dao, clock) { "id-${next++}" }
    private val library = LibraryRepository(FakeExerciseApi(LibraryResponse(emptyList())), FakeLibraryDao(), clock)
    private val vm by lazy { WorkoutViewModel(repo, library, FakeStudentSession(), FakeConnectivityObserver(), clock) }
    private val state get() = vm.uiState.value

    private fun TestScope.collect() =
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

    /** Deja al alumno con la serie 1 hecha y el descanso corriendo, y recién ahí rompe Room. */
    private suspend fun TestScope.restingWithBrokenRoom() {
        val e = RoutineExercise("re-0", "ex-0", "E0", "chest", null, null, 2, 8, 60, 40.0, null, null)
        repo.start("u1", Routine("rt-1", "Push", null, emptySet(), Instant.EPOCH, listOf(e)))
        collect()
        vm.onConfirm()
        assertTrue(state.isResting)
        dao.failWrites = true
    }

    @Test fun `saltar con Room roto avisa del descanso y el descanso sigue igual`() = runTest {
        restingWithBrokenRoom()
        val before = state.workout?.rest

        vm.onRestSkip()

        assertEquals(REST_SAVE_FAILED, state.error)
        assertTrue(state.isResting)
        assertEquals(before, state.workout?.rest)
    }

    @Test fun `ajustar y pausar con Room roto tambien avisan del descanso`() = runTest {
        restingWithBrokenRoom()
        val before = state.workout?.rest

        vm.onRestAdjust(15)
        assertEquals(REST_SAVE_FAILED, state.error)
        vm.dismissError()
        vm.onRestTogglePause()

        assertEquals(REST_SAVE_FAILED, state.error)
        assertEquals(before, state.workout?.rest)
    }

    @Test fun `el cierre automatico del descanso falla en silencio`() = runTest {
        restingWithBrokenRoom()
        clock.millis += 5 * 60_000L

        vm.onRestElapsed()

        assertNull(state.error)
    }
}
