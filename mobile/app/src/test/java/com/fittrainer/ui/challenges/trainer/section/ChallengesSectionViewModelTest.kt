package com.fittrainer.ui.challenges.trainer.section

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.challenges.trainer.TrainerChallengesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.challenges.FakeTrainerChallengesApi
import com.fittrainer.testing.fakes.challenges.FakeTrainerChallengesDao
import com.fittrainer.testing.fakes.challenges.assignmentDto
import com.fittrainer.testing.fakes.challenges.challengeDto
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.ui.challenges.trainer.ALREADY_ACTIVE
import com.fittrainer.ui.challenges.trainer.ASSIGNED_ONE
import com.fittrainer.ui.challenges.trainer.NEEDS_NETWORK
import com.fittrainer.ui.challenges.trainer.STUDENT_CHALLENGES_FAILED
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import kotlinx.coroutines.CompletableDeferred
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
class ChallengesSectionViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerChallengesApi()
    private val connectivity = FakeConnectivityObserver()
    private val repo = TrainerChallengesRepository(api, FakeTrainerChallengesDao(), MutableClock(0))

    private fun TestScope.started(): ChallengesSectionViewModel {
        val vm = ChallengesSectionViewModel(repo, FakeTrainerSession(), connectivity, MutableClock(0), SavedStateHandle(mapOf(STUDENT_ID_ARG to "s1")))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        return vm
    }

    @Test fun `sin desafios es vacio sincronizado`() = runTest {
        val state = started().uiState.value
        assertTrue(state.everSynced)
        assertTrue(state.items.isEmpty())
    }

    @Test fun `activas primero y marca cuales ya tiene`() = runTest {
        val c1 = challengeDto("c1", "Uno")
        val c2 = challengeDto("c2", "Dos")
        api.assignments["s1"] = listOf(
            assignmentDto("x", c2, status = "failed", startedAt = "2026-11-10T12:00:00Z"),
            assignmentDto("y", c1, startedAt = "2026-10-10T12:00:00Z"),
        )
        val state = started().uiState.value
        assertEquals(listOf("y", "x"), state.items.map { it.id })
        assertEquals(setOf("c1"), state.activeIds)
    }

    @Test fun `asignar desde la hoja lo muestra enseguida`() = runTest {
        val vm = started()
        vm.onOpenPick()
        advanceUntilIdle()
        assertEquals(2, vm.uiState.value.catalog.size)
        vm.onPick("c2")
        advanceUntilIdle()
        assertNull(vm.uiState.value.pick)
        assertEquals(ASSIGNED_ONE, vm.uiState.value.notice)
        assertEquals(listOf("c2"), vm.uiState.value.items.map { it.challengeId })
    }

    @Test fun `doble toque o tocar otro mientras sale es un solo POST`() = runTest {
        val vm = started()
        vm.onOpenPick()
        api.writeGate = CompletableDeferred()
        vm.onPick("c1")
        vm.onPick("c1")
        vm.onPick("c2")
        advanceUntilIdle()
        api.writeGate!!.complete(Unit)
        advanceUntilIdle()
        assertEquals(listOf("s1" to "c1"), api.singleCalls)
    }

    @Test fun `uno que ya tiene activo no se manda`() = runTest {
        api.assignments["s1"] = listOf(assignmentDto("y", challengeDto("c1", "Uno")))
        val vm = started()
        vm.onOpenPick()
        vm.onPick("c1")
        advanceUntilIdle()
        assertTrue(api.singleCalls.isEmpty())
    }

    @Test fun `un 409 avisa en la hoja y refresca`() = runTest {
        val vm = started()
        // Otro dispositivo se lo asignó después de que la ficha se bajó.
        api.assignments["s1"] = listOf(assignmentDto("y", challengeDto("c1", "Uno")))
        vm.onOpenPick()
        vm.onPick("c1")
        advanceUntilIdle()
        assertEquals(ALREADY_ACTIVE, vm.uiState.value.pick?.error)
        assertEquals(setOf("c1"), vm.uiState.value.activeIds)
    }

    @Test fun `sin red no manda`() = runTest {
        val vm = started()
        connectivity.state.value = false
        vm.onOpenPick()
        vm.onPick("c1")
        advanceUntilIdle()
        assertTrue(api.singleCalls.isEmpty())
        assertEquals(NEEDS_NETWORK, vm.uiState.value.pick?.error)
    }

    @Test fun `mientras sale no se puede cerrar la hoja`() = runTest {
        val vm = started()
        vm.onOpenPick()
        api.writeGate = CompletableDeferred()
        vm.onPick("c1")
        vm.onDismissPick()
        assertFalse(vm.uiState.value.pick == null)
        api.writeGate!!.complete(Unit)
        advanceUntilIdle()
        assertNull(vm.uiState.value.pick)
    }

    @Test fun `error del servidor al bajar ofrece reintentar`() = runTest {
        api.error = httpError(500)
        val vm = started()
        assertEquals(STUDENT_CHALLENGES_FAILED, vm.uiState.value.loadError)
        api.error = null
        vm.onRetry()
        advanceUntilIdle()
        assertNull(vm.uiState.value.loadError)
    }

    // Ronda 1 de Codex: asignar y quedarse sin red no esconde lo asignado.
    @Test fun `sin la lista bajada igual muestra lo que se asigno desde aca`() = runTest {
        api.error = java.io.IOException("sin red")
        val vm = started()
        assertFalse(vm.uiState.value.everSynced)
        vm.onOpenPick()
        vm.onPick("c1")
        advanceUntilIdle()
        assertEquals(listOf("c1"), vm.uiState.value.items.map { it.challengeId })
        assertFalse(vm.uiState.value.everSynced)
    }
}
