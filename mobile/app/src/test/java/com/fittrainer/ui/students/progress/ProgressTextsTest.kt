package com.fittrainer.ui.students.progress

import com.fittrainer.data.students.progress.DayMark
import com.fittrainer.data.students.progress.DayStatus
import java.time.LocalDate
import java.time.YearMonth
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProgressTextsTest {

    @Test fun `un mes que empieza en domingo deja 6 huecos antes porque la grilla empieza el lunes`() {
        // Noviembre 2026: el 1 es domingo.
        val cells = calendarCells(YearMonth.of(2026, 11), emptyList())
        assertEquals(6, cells.takeWhile { it == null }.size)
        assertEquals(1, cells[6]!!.day)
        assertEquals(0, cells.size % 7)
    }

    @Test fun `meses de 28, 30 y 31 dias`() {
        // Febrero 2027 empieza lunes: 28 celdas justas.
        assertEquals(28, calendarCells(YearMonth.of(2027, 2), emptyList()).size)
        assertEquals(30, calendarCells(YearMonth.of(2026, 11), emptyList()).count { it != null })
        assertEquals(31, calendarCells(YearMonth.of(2026, 12), emptyList()).count { it != null })
    }

    @Test fun `cada celda lleva el estado de su dia, y sin dato queda sin estado`() {
        val month = YearMonth.of(2026, 11)
        val cells = calendarCells(month, listOf(DayMark(LocalDate.of(2026, 11, 2), DayStatus.MISSED)))
        assertEquals(DayStatus.MISSED, cells.first { it?.day == 2 }!!.status)
        assertNull(cells.first { it?.day == 3 }!!.status)
    }

    @Test fun `textos`() {
        assertEquals("6/9", sessionsLabel(6, 9))
        assertEquals("0/0", sessionsLabel(0, 0))
        assertEquals("Asistencia · noviembre", monthTitle(YearMonth.of(2026, 11), YearMonth.of(2026, 11)))
        assertEquals("Asistencia · diciembre 2025", monthTitle(YearMonth.of(2025, 12), YearMonth.of(2026, 11)))
    }
}
