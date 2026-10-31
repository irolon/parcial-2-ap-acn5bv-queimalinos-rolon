package com.fittrainer.ui.workout.history.badge

import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistoryMetaDto
import com.fittrainer.data.api.history.HistoryPageDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.db.workout.history.HistorySessionEntity
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import com.fittrainer.data.workout.history.HistoryRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import java.time.Instant
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ProgressBadgeViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeSessionApi()
    private val dao = FakeHistoryDao()
    private val connectivity = FakeConnectivityObserver(online = true)
    private val clock = StepClock(Instant.parse("2026-10-30T12:00:00Z"))
    private val session = FakeStudentSession()
    private val vm by lazy { ProgressBadgeViewModel(HistoryRepository(api, dao, FakeWorkoutDao()) { session }, session, connectivity, clock) }

    private fun cached(id: String, comment: String?) =
        HistorySessionEntity(id, "u1", 1_000, 2_000, 50, "Push", null, null, comment, false, 3, 300.0, false, true, true)

    private fun serverHas(id: String) {
        val dto = HistorySummaryDto(id, "2026-10-29T12:00:00Z", sets = 1, volumeKg = 10.0, trainerComment = "Bien")
        api.historyPages = mapOf(1 to HistoryPageDto(listOf(dto), HistoryMetaDto(1, 1, 20, 1)))
        api.details = mapOf(id to HistoryDetailDto(id, "2026-10-29T12:00:00Z"))
    }

    @Test fun exponeLaCantidadDeSinLeer() = runTest {
        dao.state.value = FakeHistoryDao.State(sessions = listOf(cached("a", "Bien"), cached("b", "Ok"), cached("c", null)).associateBy { it.id })
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.unread.collect {} }
        advanceUntilIdle()
        assertEquals(2, vm.unread.value)
    }

    @Test fun alArrancarRefrescaYElBadgeAparece() = runTest {
        serverHas("a")
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.unread.collect {} }
        vm.onAppStart()
        advanceUntilIdle()
        assertEquals(listOf(1), api.historyRequests)
        assertEquals(1, vm.unread.value)
    }

    @Test fun noRefrescaAntesDeLosCincoMinutosPeroSiDespues() = runTest {
        serverHas("a")
        vm.onAppStart(); advanceUntilIdle()
        clock.now = clock.now.plusSeconds(4 * 60)
        vm.onAppStart(); advanceUntilIdle()
        assertEquals(1, api.historyRequests.size)
        clock.now = clock.now.plusSeconds(2 * 60)
        vm.onAppStart(); advanceUntilIdle()
        assertEquals(2, api.historyRequests.size)
    }

    @Test fun sinRedNoRefresca() = runTest {
        connectivity.state.value = false
        serverHas("a")
        vm.onAppStart(); advanceUntilIdle()
        assertEquals(emptyList<Int>(), api.historyRequests)
    }
}

/** Al abrir la app en frío la sesión llega de DataStore después del primer onAppStart (revisión de la PR #40). */
@OptIn(ExperimentalCoroutinesApi::class)
class ProgressBadgeViewModelColdStartTest {
    @get:Rule val main = MainDispatcherRule(StandardTestDispatcher())
    private val api = FakeSessionApi()
    private val session = FakeStudentSession().apply { session.value = Session.LoggedOut }
    private val vm by lazy {
        ProgressBadgeViewModel(
            HistoryRepository(api, FakeHistoryDao(), FakeWorkoutDao()) { session }, session,
            FakeConnectivityObserver(online = true), StepClock(Instant.parse("2026-10-30T12:00:00Z")),
        )
    }

    @Test fun laSesionLlegaDespuesDeOnAppStartYElRefrescoSaleIgual() = runTest {
        val dto = HistorySummaryDto("a", "2026-10-29T12:00:00Z", sets = 1, volumeKg = 10.0, trainerComment = "Bien")
        api.historyPages = mapOf(1 to HistoryPageDto(listOf(dto), HistoryMetaDto(1, 1, 20, 1)))
        api.details = mapOf("a" to HistoryDetailDto("a", "2026-10-29T12:00:00Z"))
        vm.onAppStart()
        runCurrent()
        session.session.value = Session.Student(AuthUser("u1", "Ana Pérez", "ana@test.com", Role.STUDENT))
        advanceUntilIdle()
        assertEquals(listOf(1), api.historyRequests)
    }
}
