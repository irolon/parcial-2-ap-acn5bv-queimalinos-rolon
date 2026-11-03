package com.fittrainer.ui.routines.trainer.create

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.exercises.trainer.TrainerExercisesRepository
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesApi
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import java.time.Clock
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** Igual que la asignación de E9: sin saber las rutinas activas del alumno, el asistente no crea. */
@OptIn(ExperimentalCoroutinesApi::class)
class NewRoutinePreviousTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerRoutinesApi().apply { listError = httpError(500) }
    private val repo = TrainerRoutinesRepository(api, FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val catalog = TrainerExercisesRepository(FakeTrainerExercisesApi(), FakeTrainerExercisesDao())
    private val vm by lazy {
        NewRoutineViewModel(repo, catalog, FakeTrainerSession(), FakeConnectivityObserver(), SavedStateHandle(mapOf(STUDENT_ID_ARG to "s1")))
    }

    @Test fun `si no se pudieron ver sus rutinas activas, crear avisa, no crea y vuelve a pedirlas`() = runTest {
        advanceUntilIdle()
        assertFalse(vm.uiState.value.previousKnown)
        vm.onHeaderChange { it.copy(name = "Pull", goal = "strength", days = setOf("monday")) }
        vm.onNext()
        vm.onAdd()
        advanceUntilIdle()
        vm.onPick(vm.uiState.value.picker.visible.first())
        vm.onSaveExercise()
        vm.onCreate()
        advanceUntilIdle()
        assertEquals(PREVIOUS_UNKNOWN, vm.uiState.value.notice)
        assertTrue(api.creates.isEmpty())
        // Vuelve la API: el reintento de onCreate trajo la lista; ahora sí crea y desactiva la anterior.
        api.listError = null
        vm.onCreate()
        advanceUntilIdle()
        vm.onCreate()
        advanceUntilIdle()
        assertEquals(1, api.creates.size)
        assertFalse(api.server.getValue("r1").active)
    }
}
