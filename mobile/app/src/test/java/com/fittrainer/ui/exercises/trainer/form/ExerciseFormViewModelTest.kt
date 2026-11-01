package com.fittrainer.ui.exercises.trainer.form

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.exercises.trainer.TrainerExercisesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesApi
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesDao
import com.fittrainer.testing.fakes.exercises.trainerExerciseDto
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ExerciseFormViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerExercisesApi().apply {
        exercises = exercises + trainerExerciseDto("o1", "Curl", "biceps", global = false).copy(description = "Codos pegados")
    }
    private val repo = TrainerExercisesRepository(api, FakeTrainerExercisesDao())
    private val connectivity = FakeConnectivityObserver()

    private suspend fun TestScope.vm(id: String? = null): ExerciseFormViewModel {
        repo.refresh("t1")
        val args = id?.let { mapOf(EXERCISE_ID_ARG to it) } ?: emptyMap()
        return ExerciseFormViewModel(repo, FakeTrainerSession(), connectivity, SavedStateHandle(args)).also { advanceUntilIdle() }
    }

    private fun ExerciseFormViewModel.fill() = onChange { it.copy(name = "Curl E2E", muscleGroup = "biceps", equipment = "dumbbell", videoUrl = "https://youtu.be/x") }

    @Test fun `alta guarda y el ejercicio queda en el catalogo`() = runTest {
        val vm = vm()
        vm.fill()
        vm.onSave()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.done)
        assertTrue(repo.observe("t1").first().any { it.name == "Curl E2E" && !it.isGlobal })
    }

    @Test fun `sin grupo o con un video invalido no manda nada`() = runTest {
        val vm = vm()
        vm.onChange { it.copy(name = "Curl", videoUrl = "youtube.com/x") }
        vm.onSave()
        assertEquals(setOf(ExerciseFormField.MUSCLE_GROUP, ExerciseFormField.VIDEO_URL), vm.uiState.value.errors.keys)
        assertTrue(api.creates.isEmpty())
    }

    @Test fun `un 400 se muestra en el campo`() = runTest {
        api.writeError = httpError(400, """{"error":{"code":"VALIDATION_ERROR","message":"x","details":[{"field":"name","message":"Ya existe"}]}}""")
        val vm = vm()
        vm.fill()
        vm.onSave()
        advanceUntilIdle()
        assertEquals("Ya existe", vm.uiState.value.errors[ExerciseFormField.NAME])
    }

    @Test fun `doble toque en guardar hace un solo POST`() = runTest {
        api.createGate = CompletableDeferred()
        val vm = vm()
        vm.fill()
        vm.onSave()
        runCurrent()
        vm.onSave()
        api.createGate!!.complete(Unit)
        advanceUntilIdle()
        assertEquals(1, api.creates.size)
    }

    @Test fun `sin red avisa y no llama`() = runTest {
        val vm = vm()
        connectivity.state.value = false
        runCurrent()
        vm.fill()
        vm.onSave()
        assertEquals(NEEDS_NETWORK, vm.uiState.value.message)
        assertTrue(api.creates.isEmpty())
    }

    @Test fun `editar carga los datos y manda solo lo que cambio`() = runTest {
        val vm = vm("o1")
        assertEquals("Curl", vm.uiState.value.input.name)
        vm.onChange { it.copy(description = "") }
        vm.onSave()
        advanceUntilIdle()
        assertEquals("""{"description":null}""", api.patches.single().second.toString())
        assertTrue(vm.uiState.value.done)
    }

    @Test fun `editar sin cambios vuelve sin llamar`() = runTest {
        val vm = vm("o1")
        vm.onSave()
        assertTrue(vm.uiState.value.done)
        assertTrue(api.patches.isEmpty())
    }

    @Test fun `un global o uno que ya no esta no se edita`() = runTest {
        assertTrue(vm("e1").uiState.value.gone)
        assertTrue(vm("nada").uiState.value.gone)
    }
}
