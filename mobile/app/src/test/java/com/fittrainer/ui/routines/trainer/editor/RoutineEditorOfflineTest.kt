package com.fittrainer.ui.routines.trainer.editor

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.exercises.trainer.TrainerExercisesRepository
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesApi
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.routines.exerciseDto
import com.fittrainer.testing.fakes.routines.routineDto
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import java.time.Clock
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

/** Sin conexión el editor no escribe: ni al abrir una hoja ni si la red se corta con la hoja abierta (ronda 1 de Codex). */
@OptIn(ExperimentalCoroutinesApi::class)
class RoutineEditorOfflineTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerRoutinesApi().apply {
        server["r1"] = routineDto(exercises = listOf(exerciseDto("a", 0), exerciseDto("b", 1)))
    }
    private val connectivity = FakeConnectivityObserver()
    private val repo = TrainerRoutinesRepository(api, FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val catalog = TrainerExercisesRepository(FakeTrainerExercisesApi(), FakeTrainerExercisesDao())
    private val templates = TrainerTemplatesRepository(FakeTrainerTemplatesApi(), FakeTrainerTemplatesDao(), repo, Clock.systemUTC())
    private val vm by lazy {
        RoutineEditorViewModel(repo, catalog, templates, FakeTrainerSession(), connectivity, SavedStateHandle(mapOf(ROUTINE_ID_ARG to "r1")))
    }

    private fun TestScope.started() {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
    }

    private fun TestScope.goOffline() {
        connectivity.state.value = false
        runCurrent()
    }

    @Test fun `sin red no se abren las hojas de un ejercicio ni de la cabecera`() = runTest {
        started()
        goOffline()
        vm.onOpenExercise("a")
        vm.onOpenHeader()
        assertNull(vm.uiState.value.exerciseSheet)
        assertNull(vm.uiState.value.headerSheet)
    }

    @Test fun `si la red se corta con la hoja abierta, guardar avisa y no llama al servidor`() = runTest {
        started()
        vm.onOpenExercise("a")
        vm.onExerciseChange { it.copy(rest = "120") }
        goOffline()
        vm.onSaveExercise()
        advanceUntilIdle()
        assertEquals(0, api.updateExerciseCalls)
        assertEquals(NEEDS_NETWORK, vm.uiState.value.exerciseSheet!!.message)
        assertFalse(vm.uiState.value.exerciseSheet!!.saving)
    }

    @Test fun `si la red se corta con la hoja abierta, quitar avisa y el ejercicio sigue`() = runTest {
        started()
        vm.onOpenExercise("a")
        goOffline()
        vm.onRemoveExercise()
        advanceUntilIdle()
        assertEquals(NEEDS_NETWORK, vm.uiState.value.exerciseSheet!!.message)
        assertEquals(2, api.server.getValue("r1").exercises.size)
    }

    @Test fun `si la red se corta con la cabecera abierta, guardar avisa`() = runTest {
        started()
        vm.onOpenHeader()
        vm.onHeaderChange { it.copy(name = "Push nuevo") }
        goOffline()
        vm.onSaveHeader()
        advanceUntilIdle()
        assertEquals(NEEDS_NETWORK, vm.uiState.value.headerSheet!!.message)
        assertEquals("Push", api.server.getValue("r1").name)
    }

    @Test fun `al volver la red se puede guardar`() = runTest {
        started()
        vm.onOpenExercise("a")
        vm.onExerciseChange { it.copy(rest = "120") }
        goOffline()
        vm.onSaveExercise()
        connectivity.state.value = true
        runCurrent()
        vm.onSaveExercise()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.exerciseSheet == null)
        assertEquals(120, api.server.getValue("r1").exercises.first().restSeconds)
    }
}
