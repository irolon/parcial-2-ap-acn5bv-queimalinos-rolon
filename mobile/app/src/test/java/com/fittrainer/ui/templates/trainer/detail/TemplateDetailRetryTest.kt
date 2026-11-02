package com.fittrainer.ui.templates.trainer.detail

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.students.TrainerStudentsRepository
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.students.FakeStudentDetailApi
import com.fittrainer.testing.fakes.students.FakeStudentsApi
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.FakeTrainerStudentDetailDao
import com.fittrainer.testing.fakes.students.FakeTrainerStudentsDao
import com.fittrainer.testing.fakes.students.studentDto
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.ui.templates.trainer.TEMPLATE_REFRESH_FAILED
import java.io.IOException
import java.time.Clock
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test

/** Revisión de la #63 (d y e): reintentar el detalle y cerrar el selector con un alumno ya elegido. */
@OptIn(ExperimentalCoroutinesApi::class)
class TemplateDetailRetryTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerTemplatesApi()
    private val connectivity = FakeConnectivityObserver()
    private val routines = TrainerRoutinesRepository(FakeTrainerRoutinesApi(), FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val repo = TrainerTemplatesRepository(api, FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    private val students = TrainerStudentsRepository(
        FakeStudentsApi(pages = mapOf(true to listOf(listOf(studentDto("s1", "Ana Paz"), studentDto("s2", "Beto"))))),
        FakeTrainerStudentsDao(), MutableClock(0),
    )
    private val details = TrainerStudentDetailRepository(FakeStudentDetailApi(), FakeTrainerStudentDetailDao(), Clock.systemUTC())

    private fun TestScope.vm() = TemplateDetailViewModel(
        repo, routines, students, details, FakeTrainerSession(), connectivity, SavedStateHandle(mapOf(TEMPLATE_ID_ARG to "tp1")),
    ).also { it.onStart(); advanceUntilIdle() }

    @Test fun `un 500 sin cache ofrece reintentar y al reintentar carga`() = runTest {
        api.error = httpError(500)
        val vm = vm()
        assertNull(vm.uiState.value.detail)
        assertEquals(TEMPLATE_REFRESH_FAILED, vm.uiState.value.loadError)
        api.error = null
        vm.onRetry()
        advanceUntilIdle()
        assertNotNull(vm.uiState.value.detail)
        assertNull(vm.uiState.value.loadError)
    }

    @Test fun `sin red no es error`() = runTest {
        connectivity.state.value = false
        api.error = IOException("sin red")
        assertNull(vm().uiState.value.loadError)
    }

    @Test fun `cerrar el selector despues de Cambiar vuelve a la hoja con lo editado`() = runTest {
        val vm = vm()
        vm.onAssign()
        vm.onSelectStudent(vm.uiState.value.students.first())
        advanceUntilIdle()
        vm.onNameChange("Fuerza Ana")
        vm.onPickStudent()
        vm.onDismissPicker()
        val a = vm.uiState.value.assign!!
        assertFalse(a.pickingStudent)
        assertEquals("Fuerza Ana", a.name)
        assertEquals("s1", a.student!!.id)
    }

    @Test fun `cerrar el selector sin haber elegido cierra la asignacion`() = runTest {
        val vm = vm()
        vm.onAssign()
        vm.onDismissPicker()
        assertNull(vm.uiState.value.assign)
    }
}
