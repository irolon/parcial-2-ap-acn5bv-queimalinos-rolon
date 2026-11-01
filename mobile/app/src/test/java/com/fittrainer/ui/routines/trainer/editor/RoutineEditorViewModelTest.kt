package com.fittrainer.ui.routines.trainer.editor

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.exercises.trainer.TrainerExercisesRepository
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.routines.trainer.ExerciseField
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesApi
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.routines.exerciseDto
import com.fittrainer.testing.fakes.routines.routineDto
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.routines.trainer.NEEDS_ONE_EXERCISE
import java.time.Clock
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class RoutineEditorViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerRoutinesApi().apply {
        server["r1"] = routineDto(exercises = listOf(exerciseDto("a", 0), exerciseDto("b", 1)))
    }
    private val connectivity = FakeConnectivityObserver()
    private val repo = TrainerRoutinesRepository(api, FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val catalog = TrainerExercisesRepository(FakeTrainerExercisesApi(), FakeTrainerExercisesDao())
    private val vm by lazy {
        RoutineEditorViewModel(repo, catalog, FakeTrainerSession(), connectivity, SavedStateHandle(mapOf(ROUTINE_ID_ARG to "r1")))
    }

    private fun TestScope.started() {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
    }

    private fun state() = vm.uiState.value

    @Test fun `guardar el descanso manda solo esa clave y cierra la hoja`() = runTest {
        started()
        vm.onOpenExercise("a")
        vm.onExerciseChange { it.copy(rest = "120") }
        vm.onSaveExercise()
        advanceUntilIdle()
        assertNull(state().exerciseSheet)
        assertEquals(120, state().detail!!.exercises.first().restSeconds)
    }

    @Test fun `mientras guarda la hoja queda en saving y un segundo toque no hace nada`() = runTest {
        started()
        val gate = CompletableDeferred<Unit>()
        api.updateExerciseGate = gate
        vm.onOpenExercise("a")
        vm.onExerciseChange { it.copy(sets = "5") }
        vm.onSaveExercise()
        runCurrent()
        assertTrue(state().exerciseSheet!!.saving)
        vm.onSaveExercise()
        gate.complete(Unit)
        advanceUntilIdle()
        assertEquals(1, api.updateExerciseCalls)
        assertNull(state().exerciseSheet)
    }

    @Test fun `un dato invalido marca el campo sin llamar al servidor`() = runTest {
        started()
        vm.onOpenExercise("a")
        vm.onExerciseChange { it.copy(reps = "0") }
        vm.onSaveExercise()
        assertTrue(ExerciseField.REPS in state().exerciseSheet!!.errors)
    }

    @Test fun `un 400 del backend se muestra en el campo`() = runTest {
        started()
        api.error = httpError(400, """{"error":{"code":"VALIDATION_ERROR","message":"x","details":[{"field":"tempo","message":"Muy largo"}]}}""")
        vm.onOpenExercise("a")
        vm.onExerciseChange { it.copy(tempo = "3-1-3") }
        vm.onSaveExercise()
        advanceUntilIdle()
        assertEquals("Muy largo", state().exerciseSheet!!.errors[ExerciseField.TEMPO])
    }

    @Test fun `subir el primero no hace nada y bajarlo reordena`() = runTest {
        started()
        vm.onMove("a", up = true)
        advanceUntilIdle()
        assertTrue(api.reorderCalls.isEmpty())
        vm.onMove("a", up = false)
        advanceUntilIdle()
        assertEquals(listOf(listOf("b", "a")), api.reorderCalls)
        assertEquals(listOf("b", "a"), state().detail!!.exercises.map { it.id })
    }

    @Test fun `sin conexion se ve lo cacheado y no se puede editar`() = runTest {
        started()
        connectivity.state.value = false
        runCurrent()
        assertFalse(state().canEdit)
        assertTrue(state().offline)
        assertEquals(2, state().detail!!.exercises.size)
        vm.onMove("a", up = false)
        advanceUntilIdle()
        assertTrue(api.reorderCalls.isEmpty())
    }

    @Test fun `sin cache y sin red no hay detalle`() = runTest {
        api.error = java.io.IOException("sin red")
        connectivity.state.value = false
        started()
        assertTrue(state().loaded)
        assertNull(state().detail)
    }

    @Test fun `quitar el unico ejercicio muestra el mensaje`() = runTest {
        started()
        api.removeCode = 409
        vm.onOpenExercise("a")
        vm.onRemoveExercise()
        advanceUntilIdle()
        assertEquals(NEEDS_ONE_EXERCISE, state().exerciseSheet!!.message)
    }

    @Test fun `rutina ajena al entrar marca gone`() = runTest {
        api.error = apiError(403, "FORBIDDEN")
        started()
        assertTrue(state().gone)
    }

    @Test fun `desactivar manda el PATCH y actualiza el interruptor`() = runTest {
        started()
        vm.onToggleActive(false)
        advanceUntilIdle()
        assertFalse(state().detail!!.routine.active)
        assertFalse(state().busy)
    }

    @Test fun `agregar desde el selector suma el ejercicio al final`() = runTest {
        started()
        vm.onAdd()
        advanceUntilIdle()
        assertTrue(state().picking)
        vm.onPick(state().picker.visible.first())
        vm.onExerciseChange { it.copy(rest = "60") }
        vm.onSaveExercise()
        advanceUntilIdle()
        assertFalse(state().picking)
        assertEquals(3, state().detail!!.exercises.size)
        assertEquals(60, state().detail!!.exercises.last().restSeconds)
    }

    @Test fun `editar la cabecera sin dias marca el error`() = runTest {
        started()
        vm.onOpenHeader()
        vm.onHeaderChange { it.copy(days = emptySet()) }
        vm.onSaveHeader()
        assertTrue(state().headerSheet!!.errors.isNotEmpty())
    }

    @Test fun `sin red al guardar muestra que necesita internet`() = runTest {
        started()
        api.error = java.io.IOException("sin red")
        vm.onOpenExercise("a")
        vm.onExerciseChange { it.copy(sets = "5") }
        vm.onSaveExercise()
        advanceUntilIdle()
        assertEquals(NEEDS_NETWORK, state().exerciseSheet!!.message)
    }
}
