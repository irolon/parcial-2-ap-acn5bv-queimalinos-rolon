package com.fittrainer.ui.students.overview

import com.fittrainer.data.students.overview.TrainerOverviewRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.data.api.students.InSessionDto
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeOverviewApi
import com.fittrainer.testing.fakes.students.FakeTrainerOverviewDao
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.overviewDto
import java.time.Instant
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** GX4-M2: el Inicio se refresca solo cada 60 s mientras la pantalla está empezada. */
@OptIn(ExperimentalCoroutinesApi::class)
class TrainerHomeAutoRefreshTest {

    @get:Rule val main = MainDispatcherRule()

    private val clock = MutableClock(Instant.parse("2026-11-01T18:00:00Z").toEpochMilli())
    private val api = FakeOverviewApi()
    private val connectivity = FakeConnectivityObserver()
    private val vm by lazy {
        TrainerHomeViewModel(TrainerOverviewRepository(api, FakeTrainerOverviewDao(), clock), FakeTrainerSession(), connectivity, clock)
    }

    private fun TestScope.started() {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        runCurrent()
    }

    @Test fun `a los 60 s hay un refresh automatico y a los 120 s otro`() = runTest {
        started()
        assertEquals(1, api.calls)
        advanceTimeBy(60_001)
        assertEquals(2, api.calls)
        advanceTimeBy(60_000)
        assertEquals(3, api.calls)
        vm.onStop()
    }

    @Test fun `despues de onStop no hay mas refreshes`() = runTest {
        started()
        vm.onStop()
        advanceTimeBy(120_000)
        assertEquals(1, api.calls)
    }

    @Test fun `un segundo onStart no duplica el bucle`() = runTest {
        started()
        vm.onStart()
        advanceTimeBy(60_001)
        assertEquals(3, api.calls)
        vm.onStop()
    }

    @Test fun `sin red no hay refresh automatico`() = runTest {
        started()
        connectivity.state.value = false
        advanceTimeBy(60_001)
        assertEquals(1, api.calls)
        vm.onStop()
    }

    @Test fun `un refresh automatico que falla no pone error ni refreshing`() = runTest {
        started()
        api.error = apiError(500, "INTERNAL")
        advanceTimeBy(60_001)
        assertEquals(2, api.calls)
        assertNull(vm.uiState.value.error)
        assertFalse(vm.uiState.value.refreshing)
        vm.onStop()
    }

    @Test fun `una sesion que cruza las 4 h sale de En curso sin red ni cambios en Room`() = runTest {
        // Empezó hace 3 h 59 min.
        api.response = overviewDto().copy(inSession = listOf(InSessionDto("s1", "Ana", "x9", "Pierna", "2026-11-01T14:01:00Z")))
        started()
        try {
            connectivity.state.value = false
            assertEquals(listOf("s1"), vm.uiState.value.liveInSession.map { it.studentId })
            clock.millis += 120_000
            advanceTimeBy(60_002)
            assertTrue(vm.uiState.value.liveInSession.isEmpty())
            assertEquals(1, api.calls)
        } finally {
            vm.onStop() // si una aserción falla, el bucle de 60 s no deja colgado al runTest
        }
    }
}
