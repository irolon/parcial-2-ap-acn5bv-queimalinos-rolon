package com.fittrainer.ui.students.overview.pending

import com.fittrainer.data.students.overview.TrainerOverviewRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.students.FakeOverviewApi
import com.fittrainer.testing.fakes.students.FakeTrainerOverviewDao
import com.fittrainer.testing.fakes.students.FakeTrainerSession
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
import org.junit.Rule
import org.junit.Test

/** E12: los pendientes de hoy del centro de avisos salen del resumen del Inicio. */
@OptIn(ExperimentalCoroutinesApi::class)
class PendingTodayViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val clock = Clock.fixed(Instant.parse("2026-11-01T18:00:00Z"), ZoneOffset.UTC)
    private val api = FakeOverviewApi()
    private val repository = TrainerOverviewRepository(api, FakeTrainerOverviewDao(), clock)
    private val vm by lazy { PendingTodayViewModel(repository, FakeTrainerSession()) }

    private fun TestScope.started() {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.pending.collect {} }
        vm.onStart()
        advanceUntilIdle()
    }

    @Test fun alAbrirseRefrescaYMuestraSoloLosQueTodaviaNoEntrenaron() = runTest {
        started()
        assertEquals(1, api.calls)
        assertEquals(listOf("s4", "s5"), vm.pending.value.map { it.studentId })
    }

    @Test fun sinRedQuedaLoGuardado() = runTest {
        repository.refresh("t1")
        api.error = IOException("sin red")
        started()
        assertEquals(listOf("s4", "s5"), vm.pending.value.map { it.studentId })
    }
}
