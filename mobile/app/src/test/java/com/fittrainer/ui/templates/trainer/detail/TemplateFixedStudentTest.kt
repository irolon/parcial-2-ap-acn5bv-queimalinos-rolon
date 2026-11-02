package com.fittrainer.ui.templates.trainer.detail

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.students.TrainerStudentsRepository
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.students.FakeStudentDetailApi
import com.fittrainer.testing.fakes.students.FakeStudentsApi
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.FakeTrainerStudentDetailDao
import com.fittrainer.testing.fakes.students.FakeTrainerStudentsDao
import com.fittrainer.testing.fakes.students.detailDto
import com.fittrainer.testing.fakes.students.studentDto
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
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

/**
 * Revisión de la #63 (a): la lista de Alumnos solo la baja su pestaña. Acá nadie la bajó antes (sesión
 * nueva, se llegó por Más o por Inicio → ficha), así que el caché de alumnos arranca vacío.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class TemplateFixedStudentTest {

    @get:Rule val main = MainDispatcherRule()

    private val routines = TrainerRoutinesRepository(FakeTrainerRoutinesApi(), FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val repo = TrainerTemplatesRepository(FakeTrainerTemplatesApi(), FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    private val studentsApi = FakeStudentsApi(pages = mapOf(true to listOf(listOf(studentDto("s1", "Ana Paz"), studentDto("s2", "Beto")))))
    private val students = TrainerStudentsRepository(studentsApi, FakeTrainerStudentsDao(), MutableClock(0))
    private val details = TrainerStudentDetailRepository(FakeStudentDetailApi(detailDto("s1")), FakeTrainerStudentDetailDao(), Clock.systemUTC())

    private fun TestScope.vm(studentId: String?): TemplateDetailViewModel {
        val args = mutableMapOf<String, Any>(TEMPLATE_ID_ARG to "tp1").apply { studentId?.let { put(STUDENT_ID_ARG, it) } }
        return TemplateDetailViewModel(repo, routines, students, details, FakeTrainerSession(), FakeConnectivityObserver(), SavedStateHandle(args))
            .also { it.onStart(); advanceUntilIdle() }
    }

    @Test fun `desde Mas el selector baja la lista de alumnos al entrar`() = runTest {
        val vm = vm(studentId = null)
        vm.onAssign()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.assign!!.pickingStudent)
        assertEquals(listOf("Ana Paz", "Beto"), vm.uiState.value.students.map { it.name })
    }

    @Test fun `desde la ficha el alumno fijo sale de la lista que se baja al entrar`() = runTest {
        val vm = vm(studentId = "s1")
        assertEquals("Ana Paz", vm.uiState.value.fixedStudent!!.name)
        vm.onAssign()
        advanceUntilIdle()
        assertFalse(vm.uiState.value.assign!!.pickingStudent)
        assertTrue(vm.uiState.value.assign!!.fixedStudent)
    }

    @Test fun `si la lista no baja el alumno fijo sale de la ficha cacheada`() = runTest {
        details.refresh("t1", "s1")
        studentsApi.failOn = true to 1
        val vm = vm(studentId = "s1")
        assertEquals("Tomás Rivera", vm.uiState.value.fixedStudent!!.name)
        vm.onAssign()
        advanceUntilIdle()
        assertFalse(vm.uiState.value.assign!!.pickingStudent)
        assertEquals("s1", vm.uiState.value.assign!!.student!!.id)
    }

    @Test fun `desde la ficha sin saber quien es el alumno no abre el selector`() = runTest {
        studentsApi.failOn = true to 1
        val vm = vm(studentId = "s1")
        assertTrue(vm.uiState.value.forStudent)
        assertNull(vm.uiState.value.fixedStudent)
        vm.onAssign()
        advanceUntilIdle()
        assertNull(vm.uiState.value.assign)
    }
}
