package com.fittrainer.ui.today.week

import com.fittrainer.data.gamification.GamificationSummary
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.data.workout.history.HistoryOrigin
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate

class TodayWeekStateTest {
    private val martes17 = LocalDate.of(2026, 11, 17)

    private fun item(id: String, startedAt: String) = HistoryItem(
        id = id, startedAt = Instant.parse(startedAt), durationMin = 40, routineName = "Rutina", sets = 10,
        volumeKg = 1000.0, rpe = null, hasPr = false, hasComment = false, origin = HistoryOrigin.SERVER,
    )

    private fun routine(id: String, createdAt: String, vararg days: DayOfWeek) = Routine(
        id = id, name = "R$id", goal = null, days = days.toSet(), createdAt = Instant.parse(createdAt),
        exercises = emptyList(),
    )

    private fun summary(streak: Int) = GamificationSummary(
        currentStreak = streak, longestStreak = streak, prSessions = 0, fullWeeks = 0,
        achievements = emptyList(), challenges = emptyList(), fetchedAt = Instant.parse("2026-11-17T12:00:00Z"),
    )

    private val rutinas = listOf(routine("1", "2026-10-01T00:00:00Z", DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY))

    private fun state(
        selected: LocalDate = martes17,
        sessions: List<HistoryItem> = emptyList(),
        summary: GamificationSummary? = null,
        routines: List<Routine> = rutinas,
    ) = weekState(martes17, selected, routines, sessions, summary)

    @Test
    fun `sin gamificación ni medidas no hay racha, logro ni peso`() {
        val s = state()
        assertNull(s.streak)
        assertNull(s.gamification)
        assertEquals(0, s.stats!!.monthPrs)
        assertEquals(7, s.week.size)
        assertEquals(setOf(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY), s.trainingDays)
    }

    @Test
    fun `done solo trae días de esta semana`() {
        val s = state(sessions = listOf(item("a", "2026-11-16T15:00:00Z"), item("b", "2026-11-10T15:00:00Z")))
        assertEquals(setOf(LocalDate.of(2026, 11, 16)), s.done)
    }

    @Test
    fun `racha en 0 no se muestra`() {
        assertNull(state(summary = summary(0)).streak)
        assertEquals(3, state(summary = summary(3)).streak)
    }

    @Test
    fun `selected distinto de hoy da su DayView`() {
        val lunes = LocalDate.of(2026, 11, 16)
        val s = state(selected = lunes, sessions = listOf(item("a", "2026-11-16T15:00:00Z")))
        assertEquals(lunes, s.selected)
        assertTrue(s.day is DayView.Past)
        assertEquals(DayView.Today, state().day)
    }

    @Test
    fun `con dos rutinas el mismo día gana la más nueva, como Hoy`() {
        val vieja = routine("v", "2026-09-01T00:00:00Z", DayOfWeek.WEDNESDAY)
        val nueva = routine("n", "2026-10-15T00:00:00Z", DayOfWeek.WEDNESDAY)
        val s = state(routines = listOf(vieja, nueva))
        assertEquals("n", s.next!!.routine.id)
    }
}
