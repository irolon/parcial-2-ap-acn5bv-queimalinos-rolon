package com.fittrainer.ui.routines.trainer.create

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.exercises.trainer.TrainerExercisesRepository
import com.fittrainer.data.routines.trainer.RoutineField
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesApi
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.routines.routineDto
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import java.time.Clock
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class NewRoutineViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerRoutinesApi()
    private val repo = TrainerRoutinesRepository(api, FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val catalog = TrainerExercisesRepository(FakeTrainerExercisesApi(), FakeTrainerExercisesDao())
    private val connectivity = FakeConnectivityObserver()
    private val vm by lazy {
        NewRoutineViewModel(repo, catalog, FakeTrainerSession(), connectivity, SavedStateHandle(mapOf(STUDENT_ID_ARG to "s1")))
    }

    private fun state() = vm.uiState.value

    /** Paso 1 válido y dos ejercicios del catálogo (Press de banca y Sentadilla). */
    private fun TestScope.ready() {
        advanceUntilIdle()
        vm.onHeaderChange { it.copy(name = "Pull", goal = "strength", days = setOf("friday", "tuesday")) }
        vm.onNext()
        vm.onAdd()
        advanceUntilIdle()
        state().picker.visible.forEach { exercise ->
            vm.onAdd()
            vm.onPick(exercise)
            vm.onSaveExercise()
        }
    }

    @Test fun `siguiente solo con nombre y dias validos`() = runTest {
        advanceUntilIdle()
        vm.onNext()
        assertEquals(1, state().step)
        assertTrue(RoutineField.DAYS in state().headerErrors)
        vm.onHeaderChange { it.copy(name = "Pull", goal = "strength", days = setOf("monday")) }
        vm.onNext()
        assertEquals(2, state().step)
    }

    @Test fun `crear manda el orden local y los dias en orden de la semana`() = runTest {
        ready()
        vm.onMove(1, up = true)
        vm.onCreate()
        advanceUntilIdle()
        val request = api.creates.single()
        assertEquals(listOf("tuesday", "friday"), request.days)
        assertEquals(listOf("e2", "e1"), request.exercises.map { it.exerciseId })
        assertEquals(listOf(0, 1), request.exercises.map { it.order })
        assertEquals("new1", state().done?.routineId)
        assertNull(state().done?.warning)
    }

    @Test fun `la casilla aparece si tiene una activa y viene marcada`() = runTest {
        advanceUntilIdle()
        assertTrue(state().showDeactivate)
        assertTrue(state().deactivateCurrent)
    }

    @Test fun `sin rutinas activas no aparece la casilla`() = runTest {
        api.server["r1"] = routineDto(active = false)
        advanceUntilIdle()
        assertFalse(state().showDeactivate)
    }

    @Test fun `marcada desactiva la anterior`() = runTest {
        ready()
        vm.onCreate()
        advanceUntilIdle()
        assertFalse(api.server.getValue("r1").active)
        assertTrue(api.server.getValue("new1").active)
    }

    @Test fun `desmarcada no toca la anterior`() = runTest {
        ready()
        vm.onToggleDeactivate(false)
        vm.onCreate()
        advanceUntilIdle()
        assertTrue(api.server.getValue("r1").active)
    }

    @Test fun `si falla desactivar la anterior la nueva queda y se avisa con el nombre`() = runTest {
        ready()
        api.updateError = httpError(500)
        vm.onCreate()
        advanceUntilIdle()
        assertEquals("new1", state().done?.routineId)
        assertEquals(deactivateFailed(listOf("Push")), state().done?.warning)
        assertEquals(1, api.creates.size)
    }

    @Test fun `doble toque en crear hace un solo POST`() = runTest {
        ready()
        vm.onCreate()
        vm.onCreate()
        advanceUntilIdle()
        assertEquals(1, api.creates.size)
    }

    @Test fun `sin ejercicios no crea`() = runTest {
        advanceUntilIdle()
        vm.onHeaderChange { it.copy(name = "Pull", goal = "strength", days = setOf("monday")) }
        vm.onNext()
        vm.onCreate()
        advanceUntilIdle()
        assertTrue(api.creates.isEmpty())
        assertFalse(state().canCreate)
    }

    @Test fun `si el POST falla avisa y no navega`() = runTest {
        ready()
        api.error = httpError(500)
        vm.onCreate()
        advanceUntilIdle()
        assertEquals(CREATE_FAILED, state().notice)
        assertNull(state().done)
        assertFalse(state().creating)
    }
}
