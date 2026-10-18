package com.fittrainer.ui.workout

import com.fittrainer.data.api.LibraryResponse
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Load
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

/** Confirmar y corregir con el orden real de Room (que publica después de que vuelve el guardado). */
@OptIn(ExperimentalCoroutinesApi::class)
class WorkoutViewModelConfirmTest {

    @get:Rule val main = MainDispatcherRule()

    private val dao = FakeWorkoutDao()
    private val clock = MutableClock(T0.toEpochMilli())
    private var next = 0
    private val repo = WorkoutRepository(dao, clock) { "id-${next++}" }
    private val library = LibraryRepository(FakeExerciseApi(LibraryResponse(emptyList())), FakeLibraryDao(), clock)
    private val vm by lazy { WorkoutViewModel(repo, library, FakeStudentSession(), FakeConnectivityObserver(), clock) }

    private fun ex(i: Int, rest: Int = 60) = RoutineExercise("re-$i", "ex-$i", "E$i", "chest", null, null, 2, 8, rest, 40.0, null, null)

    private suspend fun start(vararg exercises: RoutineExercise) =
        repo.start("u1", Routine("rt-1", "Push", null, emptySet(), Instant.EPOCH, exercises.toList()))

    private fun TestScope.collect() =
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

    private val state get() = vm.uiState.value

    @Test fun `corregir la serie 1 se refleja en la precarga de la serie en curso`() = runTest {
        start(ex(0), ex(1))
        collect()
        vm.onConfirm()
        clock.millis += 2_000
        vm.onRestSkip()
        vm.onSelectSet(1)
        vm.onManualEntry(45.0, 6)

        // Room publica la corrección recién después de que el guardado volvió.
        dao.holdObserve = true
        vm.onConfirm()
        dao.holdObserve = false

        assertEquals(Cursor(0, 2), state.workout?.cursor)
        assertEquals(null, state.editingSet)
        assertEquals(Load(45.0, 6), state.load)
    }

    @Test fun `doble toque sin descanso graba una sola serie`() = runTest {
        start(ex(0, rest = 0), ex(1))
        collect()

        vm.onConfirm()
        vm.onConfirm()

        assertEquals(1, state.workout?.sets?.size)
        assertEquals(Cursor(0, 2), state.workout?.cursor)
    }

    @Test fun `pasado el descarte un segundo confirmar guarda la serie 2`() = runTest {
        start(ex(0, rest = 0), ex(1))
        collect()
        vm.onConfirm()
        clock.millis += 2_000

        vm.onConfirm()

        assertEquals(listOf(1, 2), state.workout?.sets?.map { it.setNumber })
        assertEquals(Cursor(1, 1), state.workout?.cursor)
    }

    @Test fun `corregir enseguida de confirmar no se bloquea`() = runTest {
        start(ex(0, rest = 0), ex(1))
        collect()
        vm.onConfirm()

        vm.onSelectSet(1)
        vm.onManualEntry(50.0, 5)
        vm.onConfirm()

        assertEquals(50.0, state.workout?.sets?.single()?.kg)
    }

    @Test fun `corregir en un ejercicio completo vuelve a una serie pendiente`() = runTest {
        start(ex(0, rest = 0), ex(1, rest = 0))
        collect()
        vm.onConfirm()
        clock.millis += 2_000
        vm.onConfirm()
        assertEquals(Cursor(1, 1), state.workout?.cursor)
        vm.onSelectExercise(0)
        assertEquals(Cursor(0, 2), state.workout?.cursor)

        vm.onManualEntry(50.0, 5)
        vm.onConfirm()

        assertEquals(50.0, state.workout?.sets?.first { it.setNumber == 2 }?.kg)
        assertEquals(Cursor(1, 1), state.workout?.cursor)
    }

    @Test fun `si falla leer el historial precarga el plan y confirmar igual guarda`() = runTest {
        start(ex(0), ex(1))
        dao.failReads = true
        collect()

        assertEquals(Load(40.0, 8), state.load)
        vm.onConfirm()

        assertEquals(listOf(Load(40.0, 8)), state.workout?.sets?.map { Load(it.kg, it.reps) })
    }
}
