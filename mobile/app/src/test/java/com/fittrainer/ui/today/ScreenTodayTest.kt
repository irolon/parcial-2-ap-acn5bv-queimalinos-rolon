package com.fittrainer.ui.today

import com.fittrainer.data.gamification.GamificationRepository
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.workout.history.HistoryRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.gamification.FakeGamificationApi
import com.fittrainer.testing.fakes.gamification.FakeGamificationDao
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import com.fittrainer.ui.today.week.TodayWeekViewModel
import java.time.Instant
import java.time.LocalDate
import javax.inject.Provider
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

/** El "hoy" de la semana y el de Hoy tienen que ser el mismo (con el celular en UTC a la 1:00 ya es 18/11). */
class ScreenTodayTest {

    @get:Rule val mainRule = MainDispatcherRule()

    // 01:00 UTC del 18/11: en Argentina todavía es el 17.
    private val clock = StepClock(Instant.parse("2026-11-18T01:00:00Z"))
    private val session = FakeStudentSession()

    @Test fun `screenToday es la fecha del reloj del dispositivo`() {
        assertEquals(LocalDate.of(2026, 11, 18), screenToday(clock))
    }

    @Test fun `la semana y Hoy marcan el mismo dia`() {
        val routines = RoutineRepository(FakeRoutineApi(), FakeRoutineDao(), clock)
        val today = TodayViewModel(routines, session, FakeConnectivityObserver(online = true), clock)
        val week = TodayWeekViewModel(
            routines,
            HistoryRepository(FakeSessionApi(), FakeHistoryDao(), FakeWorkoutDao()) { session },
            GamificationRepository(FakeGamificationApi(), FakeGamificationDao(), routines, Provider { session }, clock),
            session,
            clock,
        )
        assertEquals(today.uiState.value.today, week.state.value.today)
        assertEquals(LocalDate.of(2026, 11, 18), week.state.value.today)
    }
}
