package com.fittrainer.ui.students

import com.fittrainer.data.students.StudentFilter
import com.fittrainer.data.students.TrainerStudentsRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeStudentsApi
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.FakeTrainerStudentsDao
import com.fittrainer.testing.fakes.students.studentDto
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class StudentsViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    // Hoy: 10/11 al mediodía argentino.
    private val clock = Clock.fixed(Instant.parse("2026-11-10T15:00:00Z"), ZoneOffset.UTC)
    private val api = FakeStudentsApi(
        pages = mapOf(
            true to listOf(
                listOf(
                    studentDto("ok", "Ana", lastSessionAt = "2026-11-09T15:00:00Z"),
                    studentDto("risk", "José Pérez", lastSessionAt = "2026-10-31T15:00:00Z"),
                    studentDto("new", "Bruno", lastSessionAt = null).copy(createdAt = "2026-11-08T12:00:00Z"),
                    studentDto("old", "Carla", lastSessionAt = "2026-11-05T15:00:00Z"),
                ),
            ),
            false to listOf(listOf(studentDto("off", "Dario", active = false))),
        ),
    )
    private val connectivity = FakeConnectivityObserver()
    private val repo = TrainerStudentsRepository(api, FakeTrainerStudentsDao(), clock)
    private val vm by lazy { StudentsViewModel(repo, FakeTrainerSession(), connectivity, clock) }

    private fun TestScope.started() {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
    }

    @Test fun `al entrar refresca y ordena en riesgo primero y despues por ultimo entreno`() = runTest {
        started()
        assertEquals(listOf(true to 1, false to 1), api.calls)
        assertEquals(listOf("risk", "ok", "old", "new"), vm.uiState.value.students.map { it.id })
    }

    @Test fun `contador activos sin los de baja y en riesgo`() = runTest {
        started()
        assertEquals(Counts(active = 4, atRisk = 1), vm.uiState.value.counts)
    }

    @Test fun `filtro en riesgo deja solo a los inactivos y de baja solo a los de baja`() = runTest {
        started()
        vm.onFilter(StudentFilter.AT_RISK)
        advanceUntilIdle()
        assertEquals(listOf("risk"), vm.uiState.value.students.map { it.id })
        vm.onFilter(StudentFilter.DISABLED)
        advanceUntilIdle()
        assertEquals(listOf("off"), vm.uiState.value.students.map { it.id })
    }

    @Test fun `busqueda y filtro se combinan`() = runTest {
        started()
        vm.onQuery("jose")
        advanceUntilIdle()
        assertEquals(listOf("risk"), vm.uiState.value.students.map { it.id })
        vm.onFilter(StudentFilter.ACTIVE)
        advanceUntilIdle()
        assertTrue(vm.uiState.value.students.isEmpty())
        assertTrue(vm.uiState.value.hasStudents)
    }

    @Test fun `error con cache muestra el aviso y la lista igual`() = runTest {
        started()
        api.failOn = true to 1
        api.error = RuntimeException("500")
        vm.onPullToRefresh()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertEquals(STUDENTS_REFRESH_FAILED, state.error)
        assertEquals(4, state.students.size)
        assertFalse(state.showErrorScreen)
    }

    @Test fun `error sin cache muestra la pantalla de error y reintentar la saca`() = runTest {
        api.failOn = true to 1
        started()
        assertTrue(vm.uiState.value.showErrorScreen)
        assertEquals(STUDENTS_OFFLINE_ERROR, vm.uiState.value.error)

        api.failOn = null
        vm.onRetry()
        advanceUntilIdle()
        assertFalse(vm.uiState.value.showErrorScreen)
        assertNull(vm.uiState.value.error)
        assertEquals(4, vm.uiState.value.students.size)
    }

    @Test fun `sin red muestra lo guardado con la hora de la ultima actualizacion`() = runTest {
        started()
        connectivity.state.value = false
        advanceUntilIdle()
        assertTrue(vm.uiState.value.offline)
        assertEquals("Actualizado hace un momento", vm.uiState.value.syncedLabel)
    }
}
