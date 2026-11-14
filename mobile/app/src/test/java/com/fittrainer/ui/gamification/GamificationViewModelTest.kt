package com.fittrainer.ui.gamification

import com.fittrainer.data.gamification.GamificationRepository
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.gamification.FakeGamificationApi
import com.fittrainer.testing.fakes.gamification.FakeGamificationDao
import com.fittrainer.testing.fakes.gamification.progressDto
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import java.io.IOException
import java.time.Instant
import javax.inject.Provider
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class GamificationViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val api = FakeGamificationApi()
    private val session = FakeStudentSession()
    private val clock = StepClock(Instant.parse("2026-10-30T15:00:00Z"))
    private val connectivity = FakeConnectivityObserver(online = true)
    private val repo = GamificationRepository(
        api, FakeGamificationDao(), RoutineRepository(FakeRoutineApi(), FakeRoutineDao(), clock), Provider { session }, clock,
    )

    private fun viewModel() = GamificationViewModel(repo, session, connectivity, clock)

    @Test fun sinFotoEsNeverSyncedYAlRefrescarQuedaListo() = runTest {
        val vm = viewModel()
        val states = mutableListOf<GamificationUiState>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.toList(states) }
        assertEquals(GamificationContent.NeverSynced, states.last().content)
        api.progress = progressDto(sessions = 3, current = 2, longest = 4)
        vm.onStart()
        advanceUntilIdle()
        assertEquals(2, (states.last().content as GamificationContent.Ready).ready.currentStreak)
    }

    @Test fun unPullQueFallaAvisa() = runTest {
        val vm = viewModel()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        api.error = IOException("sin red")
        vm.onPullToRefresh()
        advanceUntilIdle()
        assertEquals(GAMIFICATION_REFRESH_FAILED, vm.uiState.value.notice)
    }

    @Test fun unPullDejaIsRefreshingMientrasVuelaYLoBajaAlTerminar() = runTest {
        val vm = viewModel()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        api.gate = CompletableDeferred()
        vm.onPullToRefresh()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.isRefreshing)
        api.gate!!.complete(Unit)
        advanceUntilIdle()
        assertFalse(vm.uiState.value.isRefreshing)
    }
}
