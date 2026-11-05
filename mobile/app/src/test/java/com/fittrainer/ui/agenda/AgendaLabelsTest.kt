package com.fittrainer.ui.agenda

import com.fittrainer.data.agenda.AppointmentStatus
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class AgendaLabelsTest {

    private val friday = Instant.parse("2026-11-06T21:00:00Z")

    @Test fun `la etiqueta del dia`() {
        assertEquals("LUN 02", dayLabel(LocalDate.parse("2026-11-02")))
        assertEquals("MIÉ 04", dayLabel(LocalDate.parse("2026-11-04")))
        assertEquals("DOM 08", dayLabel(LocalDate.parse("2026-11-08")))
        assertEquals("VIE 06/11", dayMonthLabel(LocalDate.parse("2026-11-06")))
        assertEquals("SÁB 02/01", dayMonthLabel(LocalDate.parse("2027-01-02")))
    }

    @Test fun `la hora y el rango en hora de Argentina`() {
        assertEquals("18:00", hourLabel(friday))
        assertEquals("Vie 06/11 · 18:00", dayHourLabel(friday))
        assertEquals("Vie 06/11 · 18:00–19:00", timeRangeLabel(friday))
        assertEquals("vie 06/11 a las 18:00", shortDayHourLabel(friday))
        // 23 h: el fin es medianoche.
        assertEquals("Dom 08/11 · 23:00–00:00", timeRangeLabel(Instant.parse("2026-11-09T02:00:00Z")))
        // Las 00 h de Argentina son las 03 h UTC: el día es el de acá.
        assertEquals("Lun 09/11 · 00:00", dayHourLabel(Instant.parse("2026-11-09T03:00:00Z")))
    }

    @Test fun `los estados en mono`() {
        assertEquals(listOf("PENDIENTE", "CONFIRMADO", "CANCELADO"), AppointmentStatus.entries.map(::statusLabel))
    }
}
