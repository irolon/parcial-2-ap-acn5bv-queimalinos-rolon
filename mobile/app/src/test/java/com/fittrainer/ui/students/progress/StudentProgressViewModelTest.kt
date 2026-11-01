package com.fittrainer.ui.students.progress

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.students.progress.StudentProgressRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.StepClock
import com.fittrainer.testing.fakes.students.FakeProgressApi
import com.fittrainer.testing.fakes.students.FakeTrainerAttendanceDao
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.YearMonth
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
class StudentProgressViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    // 30/11 22:00 en Argentina = 01/12 01:00Z: el mes actual es noviembre.
    private val clock = Clock.fixed(Instant.parse("2026-12-01T01:00:00Z"), ZoneOffset.UTC)
    private val api = FakeProgressApi()
    private val repo = StudentProgressRepository(api, FakeTrainerAttendanceDao(), clock)
    private val vm by lazy {
        StudentProgressViewModel(repo, FakeTrainerSession(), FakeConnectivityObserver(), clock, SavedStateHandle(mapOf(STUDENT_ID_ARG to "s")))
    }

    private fun TestScope.started() {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
    }

    @Test fun `arranca en el mes actual argentino y no deja pasar al siguiente`() = runTest {
        started()
        assertEquals(YearMonth.of(2026, 11), vm.uiState.value.month)
        assertFalse(vm.uiState.value.canGoNext)
        vm.onNextMonth()
        advanceUntilIdle()
        assertEquals(YearMonth.of(2026, 11), vm.uiState.value.month)
        assertEquals(6, vm.uiState.value.progress!!.sessions)
    }

    @Test fun `mes anterior pide ese mes y despues se puede volver`() = runTest {
        started()
        vm.onPreviousMonth()
        advanceUntilIdle()
        assertEquals(YearMonth.of(2026, 10), vm.uiState.value.month)
        assertEquals("2026-10", api.months.last())
        assertTrue(vm.uiState.value.canGoNext)
        vm.onNextMonth()
        advanceUntilIdle()
        assertEquals(YearMonth.of(2026, 11), vm.uiState.value.month)
    }

    @Test fun `sin red y sin cache no es error y queda sin datos`() = runTest {
        api.attendanceError = IOException("sin red")
        started()
        assertNull(vm.uiState.value.progress)
        assertNull(vm.uiState.value.loadError)
        assertTrue(vm.uiState.value.loaded)
    }

    @Test fun `sin red con cache muestra lo guardado del mes`() = runTest {
        started()
        api.attendanceError = IOException("sin red")
        vm.onStart()
        advanceUntilIdle()
        assertEquals(6, vm.uiState.value.progress!!.sessions)
    }

    @Test fun `un 500 avisa con reintentar`() = runTest {
        api.attendanceError = apiError(500, "INTERNAL")
        started()
        assertEquals(PROGRESS_REFRESH_FAILED, vm.uiState.value.loadError)
        api.attendanceError = null
        vm.onRetry()
        advanceUntilIdle()
        assertNull(vm.uiState.value.loadError)
        assertEquals(6, vm.uiState.value.progress!!.sessions)
    }

    @Test fun `si el ViewModel sobrevive al cambio de mes, al volver pasa al mes nuevo`() = runTest {
        val stepClock = StepClock(Instant.parse("2026-11-01T02:00:00Z")) // 31/10 23:00 en Argentina
        val vm = StudentProgressViewModel(
            StudentProgressRepository(api, FakeTrainerAttendanceDao(), stepClock), FakeTrainerSession(), FakeConnectivityObserver(),
            stepClock, SavedStateHandle(mapOf(STUDENT_ID_ARG to "s")),
        )
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        assertEquals(YearMonth.of(2026, 10), vm.uiState.value.month)
        assertFalse(vm.uiState.value.canGoNext)

        stepClock.now = Instant.parse("2026-11-01T15:00:00Z")
        vm.onStart()
        advanceUntilIdle()
        assertEquals(YearMonth.of(2026, 11), vm.uiState.value.month)
        assertEquals(YearMonth.of(2026, 11), vm.uiState.value.current)
        assertEquals("2026-11", api.months.last())
    }

    @Test fun `si estaba mirando un mes anterior, se queda ahi pero ya puede avanzar hasta el nuevo`() = runTest {
        val stepClock = StepClock(Instant.parse("2026-11-01T02:00:00Z"))
        val vm = StudentProgressViewModel(
            StudentProgressRepository(api, FakeTrainerAttendanceDao(), stepClock), FakeTrainerSession(), FakeConnectivityObserver(),
            stepClock, SavedStateHandle(mapOf(STUDENT_ID_ARG to "s")),
        )
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        vm.onPreviousMonth()
        advanceUntilIdle()
        stepClock.now = Instant.parse("2026-11-01T15:00:00Z")
        vm.onStart()
        advanceUntilIdle()
        assertEquals(YearMonth.of(2026, 9), vm.uiState.value.month)
        assertTrue(vm.uiState.value.canGoNext)
    }

    @Test fun `no deja ir antes de enero 2020`() {
        assertFalse(StudentProgressUiState(FIRST_MONTH, YearMonth.of(2026, 11)).canGoPrevious)
        assertTrue(StudentProgressUiState(FIRST_MONTH.plusMonths(1), YearMonth.of(2026, 11)).canGoPrevious)
    }

    @Test fun `la flecha no pasa del mes del alta (hora argentina)`() = runTest {
        started()
        // 01/10 01:00Z es el 30/09 a las 22 en Argentina: el alta es de septiembre.
        vm.setCreatedAt(Instant.parse("2026-10-01T01:00:00Z"))
        vm.onPreviousMonth()
        advanceUntilIdle()
        vm.onPreviousMonth()
        advanceUntilIdle()
        assertEquals(YearMonth.of(2026, 9), vm.uiState.value.month)
        assertFalse(vm.uiState.value.canGoPrevious)
        vm.onPreviousMonth()
        advanceUntilIdle()
        assertEquals(YearMonth.of(2026, 9), vm.uiState.value.month)
    }

    @Test fun `volver a la seccion enseguida no vuelve a pedir el mes`() = runTest {
        started()
        vm.onStart()
        advanceUntilIdle()
        assertEquals(listOf("2026-11"), api.months)
    }

    @Test fun `un alta de este mes deja la flecha apagada desde el arranque`() = runTest {
        started()
        vm.setCreatedAt(Instant.parse("2026-11-20T12:00:00Z"))
        advanceUntilIdle()
        assertFalse(vm.uiState.value.canGoPrevious)
    }
}
