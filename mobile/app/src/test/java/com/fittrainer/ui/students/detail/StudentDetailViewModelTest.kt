package com.fittrainer.ui.students.detail

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.students.StudentStatus
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeStudentDetailApi
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.FakeTrainerStudentDetailDao
import com.fittrainer.testing.fakes.students.detailDto
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class StudentDetailViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val clock = Clock.fixed(Instant.parse("2026-11-01T15:00:00Z"), ZoneOffset.UTC)
    private val api = FakeStudentDetailApi()
    private val connectivity = FakeConnectivityObserver()
    private val repo = TrainerStudentDetailRepository(api, FakeTrainerStudentDetailDao(), clock)
    private val vm by lazy {
        StudentDetailViewModel(repo, FakeTrainerSession(), connectivity, clock, SavedStateHandle(mapOf(STUDENT_ID_ARG to "s1")))
    }

    private fun TestScope.started() {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
    }

    @Test fun `refresca al entrar y arma cabecera y estado`() = runTest {
        started()
        val s = vm.uiState.value
        assertEquals("Tomás Rivera", s.detail?.name)
        assertEquals("27 AÑOS · GANAR FUERZA · 2 D/SEM", s.header)
        assertEquals(StudentStatus.ACTIVE, s.status)
    }

    @Test fun `sin conexion las acciones quedan deshabilitadas`() = runTest {
        started()
        connectivity.state.value = false
        advanceUntilIdle()
        assertFalse(vm.uiState.value.canAct)
        vm.onDisable()
        assertFalse(vm.uiState.value.confirmDisable)
    }

    @Test fun `baja pide confirmacion y al confirmar manda active false`() = runTest {
        started()
        vm.onDisable()
        assertTrue(vm.uiState.value.confirmDisable)
        assertTrue(api.patches.isEmpty())
        vm.onConfirmDisable()
        advanceUntilIdle()
        assertEquals("""{"active":false}""", api.patches.single().toString())
        assertEquals(StudentStatus.DISABLED, vm.uiState.value.status)
    }

    @Test fun `baja con error de red avisa y sigue activo`() = runTest {
        started()
        api.error = IOException("sin red")
        vm.onDisable()
        vm.onConfirmDisable()
        advanceUntilIdle()
        assertEquals(DETAIL_ACTION_FAILED, vm.uiState.value.notice)
        assertTrue(vm.uiState.value.detail!!.active)
    }

    @Test fun `reactivar no pide confirmacion`() = runTest {
        api.detail = detailDto(active = false)
        started()
        vm.onReactivate()
        advanceUntilIdle()
        assertEquals("""{"active":true}""", api.patches.single().toString())
        assertTrue(vm.uiState.value.detail!!.active)
    }

    @Test fun `un alumno que ya no es del entrenador marca gone`() = runTest {
        api.error = apiError(403, "FORBIDDEN")
        started()
        assertTrue(vm.uiState.value.gone)
    }
}
