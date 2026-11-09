package com.fittrainer.data.agenda

import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class AgendaWeekTest {

    @Test fun `el lunes de un dia de semana`() {
        assertEquals(LocalDate.parse("2026-11-02"), weekStartOf(Instant.parse("2026-11-04T12:00:00Z")))
        assertEquals(LocalDate.parse("2026-11-02"), weekStartOf(Instant.parse("2026-11-02T03:00:00Z")))
    }

    // Domingo 08/11 23:30 de Argentina = lunes 09/11 02:30 UTC: sigue siendo la semana del 2.
    @Test fun `un domingo a la noche de Argentina que en UTC ya es lunes`() {
        assertEquals(LocalDate.parse("2026-11-02"), weekStartOf(Instant.parse("2026-11-09T02:30:00Z")))
        assertEquals(LocalDate.parse("2026-11-09"), weekStartOf(Instant.parse("2026-11-09T03:00:00Z")))
    }

    @Test fun `correr semanas y el domingo de la semana`() {
        val week = LocalDate.parse("2026-11-02")
        assertEquals(LocalDate.parse("2026-10-26"), shiftWeek(week, -1))
        assertEquals(LocalDate.parse("2026-11-16"), shiftWeek(week, 2))
        assertEquals(LocalDate.parse("2026-11-08"), weekEnd(week))
        assertEquals(7, weekDays(week).size)
    }

    @Test fun `los limites son las medianoches de Argentina`() {
        val bounds = weekBounds(LocalDate.parse("2026-11-02"))
        assertEquals(Instant.parse("2026-11-02T03:00:00Z").toEpochMilli(), bounds.from)
        assertEquals(Instant.parse("2026-11-09T03:00:00Z").toEpochMilli(), bounds.to)
    }

    // #78: la fecha del aviso y el argumento de la ruta; lo que falta o viene roto da null (semana actual).
    @Test fun `el lunes de una fecha ISO y de un dia de la ruta`() {
        assertEquals(LocalDate.parse("2026-11-02"), weekStartOfIso("2026-11-09T02:30:00.000Z"))
        assertEquals(null, weekStartOfIso("09/11/2026"))
        assertEquals(null, weekStartOfIso(null))
        assertEquals(LocalDate.parse("2026-11-23"), weekStartOfDay("2026-11-27"))
        assertEquals(LocalDate.parse("2026-11-23"), weekStartOfDay("2026-11-23"))
        assertEquals(null, weekStartOfDay("2026-13-01"))
        assertEquals(null, weekStartOfDay(null))
    }
}
