package com.fittrainer.ui.students.overview

import com.fittrainer.data.students.overview.TrainerOverviewRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeOverviewApi
import com.fittrainer.testing.fakes.students.FakeTrainerOverviewDao
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.overviewDto
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TrainerHomeViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val clock = Clock.fixed(Instant.parse("2026-11-01T18:00:00Z"), ZoneOffset.UTC)
    private val api = FakeOverviewApi()
    private val vm by lazy {
        TrainerHomeViewModel(TrainerOverviewRepository(api, FakeTrainerOverviewDao(), clock), FakeTrainerSession(), FakeConnectivityObserver(), clock)
    }

    private fun TestScope.started() {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        runCurrent()
    }

    @Test fun `refresca al entrar y muestra el resumen con la cabecera`() = runTest {
        started()
        val s = vm.uiState.value
        assertEquals(1, api.calls)
        assertEquals(7, s.overview!!.activeStudents)
        assertEquals("Profe Card", s.name)
        assertFalse(s.noStudents)
        vm.onStop()
    }

    @Test fun `al volver a entrar refresca de nuevo (lo comentado en E4 sale de feedback)`() = runTest {
        started()
        api.response = overviewDto(feedback = emptyList())
        vm.onStart()
        runCurrent()
        assertEquals(2, api.calls)
        assertTrue(vm.uiState.value.overview!!.feedback.isEmpty())
        vm.onStop()
    }

    @Test fun `arranca en Hoy y el filtro elegido sobrevive a un refresh`() = runTest {
        started()
        assertEquals(HomeFilter.TODAY, vm.uiState.value.filter)
        vm.onFilter(HomeFilter.FEEDBACK)
        vm.onPullToRefresh()
        runCurrent()
        assertEquals(HomeFilter.FEEDBACK, vm.uiState.value.filter)
        vm.onStop()
    }

    @Test fun `sin alumnos muestra el estado de invitar`() = runTest {
        api.response = overviewDto(active = 0)
        started()
        assertTrue(vm.uiState.value.noStudents)
        vm.onStop()
    }

    @Test fun `error con cache conserva el resumen y avisa`() = runTest {
        started()
        api.error = apiError(500, "INTERNAL")
        vm.onPullToRefresh()
        runCurrent()
        assertEquals(HOME_REFRESH_FAILED, vm.uiState.value.error)
        assertEquals(7, vm.uiState.value.overview!!.activeStudents)
        assertFalse(vm.uiState.value.showErrorScreen)
        vm.onStop()
    }

    @Test fun `error sin cache muestra la pantalla de error y reintentar la saca`() = runTest {
        api.error = IOException("sin red")
        started()
        assertTrue(vm.uiState.value.showErrorScreen)
        api.error = null
        vm.onRetry()
        runCurrent()
        assertFalse(vm.uiState.value.showErrorScreen)
        assertNull(vm.uiState.value.error)
        vm.onStop()
    }
}
