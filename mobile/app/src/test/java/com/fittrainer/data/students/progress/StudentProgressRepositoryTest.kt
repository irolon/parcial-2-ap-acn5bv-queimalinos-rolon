package com.fittrainer.data.students.progress

import com.fittrainer.testing.fakes.students.FakeProgressApi
import com.fittrainer.testing.fakes.students.FakeTrainerAttendanceDao
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneOffset
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class StudentProgressRepositoryTest {

    private val api = FakeProgressApi()
    private val dao = FakeTrainerAttendanceDao()
    private val repo = StudentProgressRepository(api, dao, Clock.fixed(Instant.ofEpochMilli(3_000), ZoneOffset.UTC))
    private val nov = YearMonth.of(2026, 11)

    @Test fun `refresh guarda asistencia y racha juntas`() = runTest {
        assertTrue(repo.refreshMonth("t1", "s", nov).isSuccess)
        val p = repo.observeMonth("t1", "s", nov).first()!!
        assertEquals(6, p.sessions)
        assertEquals(9, p.assignedDays)
        assertEquals(2, p.prs)
        assertEquals(4, p.streak)
        assertEquals(DayMark(LocalDate.of(2026, 11, 2), DayStatus.MISSED), p.days[1])
        assertEquals(listOf("2026-11"), api.months)
    }

    @Test fun `si falla la racha no se guarda nada y queda lo anterior`() = runTest {
        repo.refreshMonth("t1", "s", nov)
        api.streak = 9
        api.streakError = IOException("corte")
        assertTrue(repo.refreshMonth("t1", "s", nov).isFailure)
        assertEquals(4, repo.observeMonth("t1", "s", nov).first()!!.streak)
    }

    @Test fun `si falla la asistencia sin cache no hay nada`() = runTest {
        api.attendanceError = IOException("sin red")
        assertTrue(repo.refreshMonth("t1", "s", nov).isFailure)
        assertNull(repo.observeMonth("t1", "s", nov).first())
    }

    @Test fun `cada mes y cada entrenador por separado`() = runTest {
        repo.refreshMonth("t1", "s", nov)
        assertNull(repo.observeMonth("t1", "s", nov.minusMonths(1)).first())
        assertNull(repo.observeMonth("t2", "s", nov).first())
        repo.clearUserData("t2")
        assertTrue(repo.observeMonth("t1", "s", nov).first() != null)
        repo.clearUserData("t1")
        assertNull(repo.observeMonth("t1", "s", nov).first())
    }
}
