package com.fittrainer.ui.templates.trainer.detail

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.students.TrainerStudentsRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.students.FakeStudentsApi
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.FakeTrainerStudentsDao
import com.fittrainer.testing.fakes.students.studentDto
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import com.fittrainer.ui.templates.trainer.PREVIOUS_FAILED
import com.fittrainer.ui.templates.trainer.assign.PreviousRoutines
import java.time.Clock
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** Ronda 1 de Codex: la navegación se consume una vez y no se asigna sin conocer las rutinas activas. */
@OptIn(ExperimentalCoroutinesApi::class)
class TemplateAssignRoundOneTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerTemplatesApi()
    private val routinesApi = FakeTrainerRoutinesApi()
    private val routines = TrainerRoutinesRepository(routinesApi, FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val repo = TrainerTemplatesRepository(api, FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    private val students = TrainerStudentsRepository(
        FakeStudentsApi(pages = mapOf(true to listOf(listOf(studentDto("s1", "Ana Paz"))))), FakeTrainerStudentsDao(), MutableClock(0),
    )

    /** Detalle abierto desde la ficha de s1 (alumno fijo), con la hoja "Asignar" abierta. */
    private suspend fun TestScope.opened(): TemplateDetailViewModel {
        students.refresh("t1")
        val args = mapOf(TEMPLATE_ID_ARG to "tp1", STUDENT_ID_ARG to "s1")
        return TemplateDetailViewModel(repo, routines, students, FakeTrainerSession(), FakeConnectivityObserver(), SavedStateHandle(args)).also {
            it.onStart()
            advanceUntilIdle()
            it.onAssign()
            advanceUntilIdle()
        }
    }

    @Test fun `la navegacion al editor se consume y al volver no se repite`() = runTest {
        val vm = opened()
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals("rt-1", vm.uiState.value.done!!.routineId)
        vm.onDoneHandled()
        assertNull(vm.uiState.value.done)
        // De vuelta en el detalle se puede asignar otra vez (otro alumno, otros días).
        vm.onAssign()
        advanceUntilIdle()
        assertNotNull(vm.uiState.value.assign)
    }

    @Test fun `mientras cargan las rutinas activas no se puede asignar`() = runTest {
        val gate = CompletableDeferred<Unit>()
        routinesApi.listGate = gate
        val vm = opened()
        assertEquals(PreviousRoutines.LOADING, vm.uiState.value.assign!!.previous)
        assertFalse(vm.uiState.value.assign!!.canSubmit)
        vm.onSubmit()
        advanceUntilIdle()
        assertTrue(api.instantiates.isEmpty())
        gate.complete(Unit)
        advanceUntilIdle()
        assertEquals(PreviousRoutines.READY, vm.uiState.value.assign!!.previous)
        assertTrue(vm.uiState.value.assign!!.showDeactivate)
        vm.onSubmit()
        advanceUntilIdle()
        assertFalse(routinesApi.server.getValue("r1").active)
    }

    @Test fun `si falla el GET sin cache no asigna, avisa y reintentar lo destraba`() = runTest {
        routinesApi.listError = httpError(500)
        val vm = opened()
        val a = vm.uiState.value.assign!!
        assertEquals(PreviousRoutines.FAILED, a.previous)
        assertEquals(PREVIOUS_FAILED, a.message)
        vm.onSubmit()
        advanceUntilIdle()
        assertTrue(api.instantiates.isEmpty())
        routinesApi.listError = null
        vm.onRetryPrevious()
        advanceUntilIdle()
        assertEquals(PreviousRoutines.READY, vm.uiState.value.assign!!.previous)
        assertTrue(vm.uiState.value.assign!!.canSubmit)
    }

    @Test fun `si falla el GET pero hay cache se usa el cache`() = runTest {
        routines.refreshList("t1", "s1")
        routinesApi.listError = httpError(500)
        val vm = opened()
        assertEquals(PreviousRoutines.READY, vm.uiState.value.assign!!.previous)
        assertTrue(vm.uiState.value.assign!!.showDeactivate)
    }
}
