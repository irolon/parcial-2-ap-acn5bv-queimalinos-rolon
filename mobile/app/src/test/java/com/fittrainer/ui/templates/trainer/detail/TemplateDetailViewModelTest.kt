package com.fittrainer.ui.templates.trainer.detail

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.RoutineField
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
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.routines.trainer.create.deactivateFailed
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import java.time.Clock
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** Detalle y "Asignar" (E9). r1 (de routineDto) es la rutina activa de s1. */
@OptIn(ExperimentalCoroutinesApi::class)
class TemplateDetailViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerTemplatesApi()
    private val routinesApi = FakeTrainerRoutinesApi()
    private val connectivity = FakeConnectivityObserver()
    private val routines = TrainerRoutinesRepository(routinesApi, FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val repo = TrainerTemplatesRepository(api, FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    private val students = TrainerStudentsRepository(
        FakeStudentsApi(pages = mapOf(true to listOf(listOf(studentDto("s1", "Ana Paz"), studentDto("s2", "Beto"))))),
        FakeTrainerStudentsDao(), MutableClock(0),
    )

    private fun TestScope.vm(studentId: String? = null): TemplateDetailViewModel {
        val args = mutableMapOf<String, Any>(TEMPLATE_ID_ARG to "tp1").apply { studentId?.let { put(STUDENT_ID_ARG, it) } }
        return TemplateDetailViewModel(repo, routines, students, FakeTrainerSession(), connectivity, SavedStateHandle(args)).also {
            it.onStart()
            advanceUntilIdle()
        }
    }

    private suspend fun TestScope.ready(studentId: String? = "s1"): TemplateDetailViewModel {
        students.refresh("t1")
        return vm(studentId).also { it.onAssign(); advanceUntilIdle() }
    }

    @Test fun `el detalle trae los ejercicios en orden`() = runTest {
        val vm = vm()
        assertEquals(listOf("Press de banca", "Sentadilla"), vm.uiState.value.detail!!.exercises.map { it.name })
    }

    @Test fun `la hoja arranca con el nombre y los dias de la plantilla y los manda en orden de la semana`() = runTest {
        val vm = ready()
        val a = vm.uiState.value.assign!!
        assertEquals("Fuerza 3 días", a.name)
        assertEquals(setOf("monday", "friday"), a.days)
        assertTrue(a.fixedStudent)
        vm.onToggleDeactivate(false)
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(listOf("monday", "friday"), api.instantiates.single().second.days)
    }

    @Test fun `desde Mas primero se elige el alumno`() = runTest {
        val vm = ready(studentId = null)
        assertTrue(vm.uiState.value.assign!!.pickingStudent)
        assertEquals(listOf("Ana Paz", "Beto"), vm.uiState.value.students.map { it.name })
        vm.onSelectStudent(vm.uiState.value.students.last())
        advanceUntilIdle()
        assertFalse(vm.uiState.value.assign!!.pickingStudent)
        assertEquals("s2", vm.uiState.value.assign!!.student!!.id)
    }

    @Test fun `con la casilla marcada desactiva la anterior y navega a la nueva`() = runTest {
        val vm = ready()
        assertTrue(vm.uiState.value.assign!!.showDeactivate)
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals("rt-1", vm.uiState.value.done!!.routineId)
        assertNull(vm.uiState.value.done!!.warning)
        assertFalse(routinesApi.server.getValue("r1").active)
    }

    @Test fun `si falla desactivar la anterior se asigna igual y avisa`() = runTest {
        val vm = ready()
        routinesApi.updateError = httpError(500)
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(deactivateFailed(listOf("Push")), vm.uiState.value.done!!.warning)
    }

    @Test fun `doble toque y toque despues de asignada hacen un solo POST`() = runTest {
        val vm = ready()
        vm.onSubmit()
        vm.onSubmit()
        advanceUntilIdle()
        vm.onAssign()
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(1, api.instantiates.size)
    }

    @Test fun `un 409 muestra el mensaje del backend y no navega`() = runTest {
        val vm = ready()
        api.instantiateError = httpError(409, """{"error":{"code":"TEMPLATE_STRUCTURE_INVALID","message":"La plantilla está incompleta"}}""")
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals("La plantilla está incompleta", vm.uiState.value.assign!!.message)
        assertNull(vm.uiState.value.done)
        assertFalse(vm.uiState.value.assign!!.submitting)
    }

    @Test fun `sin red avisa y no llama`() = runTest {
        val vm = ready()
        connectivity.state.value = false
        runCurrent()
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(NEEDS_NETWORK, vm.uiState.value.assign!!.message)
        assertTrue(api.instantiates.isEmpty())
    }

    @Test fun `sin dias o con nombre corto no asigna`() = runTest {
        val vm = ready()
        vm.onToggleDay("monday")
        vm.onToggleDay("friday")
        vm.onNameChange("F")
        vm.onSubmit()
        assertEquals(setOf(RoutineField.NAME, RoutineField.DAYS), vm.uiState.value.assign!!.errors.keys)
        assertTrue(api.instantiates.isEmpty())
    }

    @Test fun `plantilla borrada marca gone`() = runTest {
        api.server.clear()
        assertTrue(vm().uiState.value.gone)
    }
}
