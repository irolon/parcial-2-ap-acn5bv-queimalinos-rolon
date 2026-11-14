package com.fittrainer.ui.gamification.celebration

import com.fittrainer.data.gamification.Celebration
import com.fittrainer.data.gamification.FinishedSession
import com.fittrainer.data.gamification.GamificationRepository
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.gamification.FakeGamificationApi
import com.fittrainer.testing.fakes.gamification.FakeGamificationDao
import com.fittrainer.testing.fakes.gamification.progressDto
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import java.time.Instant
import javax.inject.Provider
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CelebrationViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val api = FakeGamificationApi()
    private val dao = FakeGamificationDao()
    private val session = FakeStudentSession()
    private val clock = StepClock(Instant.parse("2026-10-30T15:00:00Z"))
    private val repo = GamificationRepository(api, dao, RoutineRepository(FakeRoutineApi(), FakeRoutineDao(), clock), Provider { session }, clock)

    @Test fun alCerrarUnaSesionNuevaEvaluaYMuestraLaCelebracion() = runTest {
        api.progress = progressDto(sessions = 6, current = 6, longest = 6, last = "2026-10-29")
        repo.refresh("u1")
        val vm = CelebrationViewModel(repo, session)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.pending.collect {} }
        val fetchedAt = dao.state.value.snapshots.getValue("u1").fetchedAt
        dao.state.update { it.copy(finished = mapOf("u1" to listOf(FinishedSession(fetchedAt - 60_000, fetchedAt + 60_000)))) }
        advanceUntilIdle()
        assertEquals(listOf("STREAK_7_DAYS"), vm.pending.value.map { it.code })
        vm.onShown(listOf("STREAK_7_DAYS"))
        advanceUntilIdle()
        assertEquals(emptyList<Celebration>(), vm.pending.value)
    }
}
