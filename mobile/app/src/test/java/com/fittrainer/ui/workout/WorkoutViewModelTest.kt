package com.fittrainer.ui.workout

import com.fittrainer.data.api.LibraryResponse
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.data.workout.WorkoutSummary
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.library.FakeExerciseApi
import com.fittrainer.testing.fakes.library.FakeLibraryDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import com.fittrainer.testing.fakes.workout.T0
import java.time.Instant
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

@OptIn(ExperimentalCoroutinesApi::class)
class WorkoutViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val dao = FakeWorkoutDao()
    private val clock = MutableClock(T0.toEpochMilli())
    private var next = 0
    private val repo = WorkoutRepository(dao, clock) { "id-${next++}" }
    private val library = LibraryRepository(FakeExerciseApi(LibraryResponse(emptyList())), FakeLibraryDao(), clock)
    // lazy: el viewModelScope se crea con el Main que instala la regla.
    private val vm by lazy { WorkoutViewModel(repo, library, FakeStudentSession(), FakeConnectivityObserver(), clock) }

    private fun ex(i: Int) = RoutineExercise("re-$i", "ex-$i", "E$i", "chest", null, null, 2, 8, 60, 40.0, null, null)

    private suspend fun start(vararg exercises: RoutineExercise = arrayOf(ex(0), ex(1))) =
        repo.start("u1", Routine("rt-1", "Push", null, emptySet(), Instant.EPOCH, exercises.toList()))

    private fun TestScope.collect() =
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

    private val state get() = vm.uiState.value

    @Test fun `al abrir precarga el plan del PT en la primera serie`() = runTest {
        start()
        collect()
        assertEquals(Load(40.0, 8), state.load)
        assertEquals(Cursor(0, 1), state.workout?.cursor)
    }

    @Test fun `ajustar el peso nunca baja de 0 y la carga manual reemplaza todo`() = runTest {
        start()
        collect()
        vm.onAdjustKg(2.5)
        assertEquals(42.5, state.load.kg, 0.0)
        vm.onAdjustKg(-100.0)
        assertEquals(0.0, state.load.kg, 0.0)
        vm.onManualEntry(62.5, 12)
        assertEquals(Load(62.5, 12), state.load)
    }

    @Test fun `confirmar arranca el descanso y la serie 2 precarga lo de la 1`() = runTest {
        start()
        collect()
        vm.onAdjustKg(-2.5)

        vm.onConfirm()

        assertTrue(state.isResting)
        assertEquals(Cursor(0, 2), state.workout?.cursor)
        assertEquals(Load(37.5, 8), state.load)
    }

    @Test fun `corregir una serie hecha no arranca descanso y vuelve a la serie en curso`() = runTest {
        start()
        collect()
        vm.onConfirm()
        vm.onRestSkip()

        vm.onSelectSet(1)
        assertTrue(state.isCorrecting)
        vm.onManualEntry(45.0, 6)
        vm.onConfirm()

        assertNull(state.editingSet)
        assertFalse(state.isResting)
        assertEquals(45.0, state.workout?.sets?.single()?.kg)
    }

    @Test fun `terminar muestra el resumen y no cierra la pantalla`() = runTest {
        start()
        collect()
        vm.onConfirm()
        clock.millis += 10 * 60_000L
        val seen = mutableListOf<WorkoutUiState>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect { seen += it } }

        // Room publica el null mientras finish() todavía no devolvió el resumen.
        val gate = CompletableDeferred<Unit>().also { dao.gate = it }
        vm.onFinish()
        gate.complete(Unit)

        assertEquals(WorkoutSummary(1, 10, "id-0"), state.summary)
        assertTrue(seen.any { it.workout == null && it.summary == null })
        assertTrue(seen.none { it.closed })
    }

    @Test fun `la ultima serie lleva directo al resumen`() = runTest {
        start(ex(0))
        collect()
        vm.onConfirm()
        clock.millis += 5_000 // pasa el descarte del doble toque
        vm.onRestSkip()
        vm.onConfirm()

        assertEquals(2, state.summary?.sets)
    }

    @Test fun `terminar sin series y descartar cierran la pantalla`() = runTest {
        start()
        collect()
        vm.onFinish()
        assertTrue(state.closed)

        start()
        vm.onDiscard()
        assertTrue(state.closed)
    }

    @Test fun `si Room falla avisa y no avanza`() = runTest {
        start()
        collect()
        dao.failWrites = true

        vm.onConfirm()

        assertEquals(SAVE_FAILED, state.error)
        assertEquals(Cursor(0, 1), state.workout?.cursor)
        assertEquals(Load(40.0, 8), state.load)
    }

    @Test fun `al abrir con el descanso vencido vuelve a la serie`() = runTest {
        start()
        repo.saveSet("u1", 0, 1, Load(40.0, 8))
        clock.millis += 5 * 60_000L

        collect()

        assertFalse(state.isResting)
        assertEquals(Cursor(0, 2), state.workout?.cursor)
    }

    @Test fun `mientras Room no contesta no esta cargado ni cerrado`() = runTest {
        start()
        dao.holdObserve = true
        collect()

        assertFalse(state.loaded)
        assertFalse(state.closed)

        dao.holdObserve = false

        assertTrue(state.loaded)
        assertFalse(state.closed)
        assertEquals(Cursor(0, 1), state.workout?.cursor)
    }
}
