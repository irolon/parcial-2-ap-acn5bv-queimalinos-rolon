package com.fittrainer.ui.challenges.trainer.list

import com.fittrainer.data.challenges.trainer.TrainerChallengesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.challenges.FakeTrainerChallengesApi
import com.fittrainer.testing.fakes.challenges.FakeTrainerChallengesDao
import com.fittrainer.testing.fakes.challenges.challengeDto
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.ui.challenges.trainer.CHALLENGES_REFRESH_FAILED
import java.io.IOException
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
class ChallengesViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerChallengesApi()
    private val connectivity = FakeConnectivityObserver()
    private val repo = TrainerChallengesRepository(api, FakeTrainerChallengesDao(), MutableClock(0))

    private fun TestScope.started() = ChallengesViewModel(repo, FakeTrainerSession(), connectivity).also {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { it.uiState.collect {} }
        it.onStart()
        advanceUntilIdle()
    }

    @Test fun `muestra predefinidos y despues propios`() = runTest {
        api.challenges = listOf(challengeDto("g", "Global"), challengeDto("p", "Propio", own = true))
        val state = started().uiState.value
        assertEquals(listOf("g", "p"), state.challenges.map { it.id })
        assertTrue(state.everSynced)
    }

    @Test fun `sin red y sin cache no es error`() = runTest {
        api.error = IOException("sin red")
        connectivity.state.value = false
        val state = started().uiState.value
        assertFalse(state.everSynced)
        assertTrue(state.offline)
        assertNull(state.loadError)
    }

    @Test fun `error del servidor ofrece reintentar`() = runTest {
        api.error = httpError(500)
        val vm = started()
        assertEquals(CHALLENGES_REFRESH_FAILED, vm.uiState.value.loadError)
        api.error = null
        vm.onRetry()
        advanceUntilIdle()
        assertNull(vm.uiState.value.loadError)
        assertEquals(2, vm.uiState.value.challenges.size)
    }
}
