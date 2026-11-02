package com.fittrainer.ui.routines.trainer.section

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.routines.routineDto
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.ui.routines.trainer.ROUTINES_REFRESH_FAILED
import com.fittrainer.ui.routines.trainer.routineDaysLabel
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
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
class RoutinesSectionViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerRoutinesApi()
    private val connectivity = FakeConnectivityObserver()
    private val repo = TrainerRoutinesRepository(api, FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val vm by lazy {
        RoutinesSectionViewModel(repo, FakeTrainerSession(), connectivity, SavedStateHandle(mapOf(STUDENT_ID_ARG to "s1")))
    }

    private fun TestScope.started() {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
    }

    @Test fun `activas primero y cada grupo de la mas nueva a la mas vieja`() = runTest {
        api.server["old"] = routineDto("old", active = true).copy(createdAt = "2026-09-01T12:00:00Z")
        api.server["off"] = routineDto("off", active = false).copy(createdAt = "2026-10-30T12:00:00Z")
        started()
        assertEquals(listOf("r1", "old", "off"), vm.uiState.value.routines.map { it.id })
        assertTrue(vm.uiState.value.everSynced)
    }

    @Test fun `dias en orden de la semana`() {
        assertEquals("LUN · MIÉ · VIE", routineDaysLabel(listOf("friday", "monday", "wednesday")))
    }

    @Test fun `sin rutinas es estado vacio sincronizado`() = runTest {
        api.server.clear()
        started()
        assertTrue(vm.uiState.value.loaded)
        assertTrue(vm.uiState.value.everSynced)
        assertTrue(vm.uiState.value.routines.isEmpty())
    }

    @Test fun `sin red y sin cache no es error y muestra que no se bajo`() = runTest {
        api.error = IOException("sin red")
        connectivity.state.value = false
        started()
        assertFalse(vm.uiState.value.everSynced)
        assertNull(vm.uiState.value.loadError)
        assertTrue(vm.uiState.value.offline)
    }

    @Test fun `error del servidor ofrece reintentar y el reintento carga`() = runTest {
        api.error = httpError(500)
        started()
        assertEquals(ROUTINES_REFRESH_FAILED, vm.uiState.value.loadError)
        api.error = null
        vm.onRetry()
        advanceUntilIdle()
        assertNull(vm.uiState.value.loadError)
        assertEquals(listOf("r1"), vm.uiState.value.routines.map { it.id })
    }

    @Test fun `con cache y sin red se sigue viendo la lista`() = runTest {
        started()
        api.error = IOException("sin red")
        connectivity.state.value = false
        vm.onStart()
        advanceUntilIdle()
        assertEquals(listOf("r1"), vm.uiState.value.routines.map { it.id })
    }
}
