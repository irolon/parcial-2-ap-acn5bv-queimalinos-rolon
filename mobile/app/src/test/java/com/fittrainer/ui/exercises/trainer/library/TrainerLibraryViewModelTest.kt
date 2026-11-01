package com.fittrainer.ui.exercises.trainer.library

import com.fittrainer.data.exercises.trainer.TrainerExercisesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesApi
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesDao
import com.fittrainer.testing.fakes.exercises.trainerExerciseDto
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.ui.exercises.trainer.EXERCISE_DELETED
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TrainerLibraryViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerExercisesApi().apply {
        exercises = exercises + trainerExerciseDto("o1", "Curl martillo", "biceps", global = false)
    }
    private val connectivity = FakeConnectivityObserver()
    private val vm by lazy { TrainerLibraryViewModel(TrainerExercisesRepository(api, FakeTrainerExercisesDao()), FakeTrainerSession(), connectivity) }

    private fun TestScope.started() {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
    }

    private fun ids() = vm.uiState.value.visible.map { it.id }

    @Test fun `muestra globales y propios por nombre y solo mios filtra`() = runTest {
        started()
        assertEquals(listOf("o1", "e1", "e2"), ids())
        vm.onToggleOnlyOwn()
        assertEquals(listOf("o1"), ids())
    }

    @Test fun `la busqueda y el grupo se combinan con solo mios`() = runTest {
        started()
        vm.picker.onQuery("press")
        runCurrent()
        assertEquals(listOf("e1"), ids())
        vm.onToggleOnlyOwn()
        assertTrue(ids().isEmpty())
    }

    @Test fun `un global no se puede borrar`() = runTest {
        started()
        vm.onSelect(vm.uiState.value.visible.first { it.id == "e1" })
        vm.onAskDelete()
        assertNull(vm.uiState.value.confirmDelete)
    }

    @Test fun `borrar uno propio lo saca y avisa`() = runTest {
        started()
        vm.onSelect(vm.uiState.value.visible.first { it.id == "o1" })
        vm.onAskDelete()
        vm.onConfirmDelete()
        advanceUntilIdle()
        assertEquals(EXERCISE_DELETED, vm.uiState.value.notice)
        assertTrue("o1" !in ids())
        assertNull(vm.uiState.value.selected)
    }

    @Test fun `borrar uno en uso muestra el mensaje del backend y sigue en la lista`() = runTest {
        api.inUse += "o1"
        started()
        vm.onSelect(vm.uiState.value.visible.first { it.id == "o1" })
        vm.onAskDelete()
        vm.onConfirmDelete()
        advanceUntilIdle()
        assertEquals("El ejercicio está en una rutina o en una sesión", vm.uiState.value.notice)
        assertTrue("o1" in ids())
    }

    @Test fun `sin red no borra y avisa`() = runTest {
        started()
        connectivity.state.value = false
        runCurrent()
        vm.onSelect(vm.uiState.value.visible.first { it.id == "o1" })
        vm.onAskDelete()
        vm.onConfirmDelete()
        advanceUntilIdle()
        assertEquals(NEEDS_NETWORK, vm.uiState.value.notice)
        assertTrue(api.exercises.any { it.id == "o1" })
    }
}
