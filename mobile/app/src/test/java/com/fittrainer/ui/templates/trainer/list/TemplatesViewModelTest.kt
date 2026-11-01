package com.fittrainer.ui.templates.trainer.list

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
import com.fittrainer.testing.fakes.templates.templateDto
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import com.fittrainer.ui.templates.trainer.TEMPLATES_REFRESH_FAILED
import java.io.IOException
import java.time.Clock
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TemplatesViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerTemplatesApi()
    private val connectivity = FakeConnectivityObserver()
    private val routines = TrainerRoutinesRepository(FakeTrainerRoutinesApi(), FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val repo = TrainerTemplatesRepository(api, FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    private val students = TrainerStudentsRepository(
        FakeStudentsApi(pages = mapOf(true to listOf(listOf(studentDto("s1", "Ana Paz"))))), FakeTrainerStudentsDao(), MutableClock(0),
    )

    private fun vm(studentId: String? = null) = TemplatesViewModel(
        repo, students, FakeTrainerSession(), connectivity, SavedStateHandle(studentId?.let { mapOf(STUDENT_ID_ARG to it) } ?: emptyMap()),
    )

    private fun TestScope.started(vm: TemplatesViewModel) = vm.also {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { it.uiState.collect {} }
        it.onStart()
        advanceUntilIdle()
    }

    @Test fun `ordena por nombre`() = runTest {
        api.server["tp0"] = templateDto("tp0", "Abdominales")
        val vm = started(vm())
        assertEquals(listOf("Abdominales", "Fuerza 3 días"), vm.uiState.value.templates.map { it.name })
        assertNull(vm.uiState.value.studentName)
    }

    @Test fun `sin plantillas es vacio sincronizado`() = runTest {
        api.server.clear()
        val vm = started(vm())
        assertTrue(vm.uiState.value.everSynced)
        assertTrue(vm.uiState.value.templates.isEmpty())
    }

    @Test fun `sin red y sin cache no es error y queda como no bajado`() = runTest {
        api.error = IOException("sin red")
        connectivity.state.value = false
        val vm = started(vm())
        assertFalse(vm.uiState.value.everSynced)
        assertNull(vm.uiState.value.loadError)
    }

    @Test fun `error del servidor ofrece reintentar`() = runTest {
        api.error = httpError(500)
        val vm = started(vm())
        assertEquals(TEMPLATES_REFRESH_FAILED, vm.uiState.value.loadError)
        api.error = null
        vm.onRetry()
        advanceUntilIdle()
        assertEquals(1, vm.uiState.value.templates.size)
    }

    @Test fun `desde la ficha el titulo lleva el nombre del alumno`() = runTest {
        students.refresh("t1")
        val vm = started(vm("s1"))
        assertEquals("Ana Paz", vm.uiState.value.studentName)
        assertEquals("s1", vm.uiState.value.studentId)
    }
}
