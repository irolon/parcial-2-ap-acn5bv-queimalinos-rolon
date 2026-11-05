package com.fittrainer.ui.agenda.trainer

import com.fittrainer.data.agenda.Appointment
import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.data.agenda.AvailabilitySlot
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class AgendaTextsTest {

    private val friday = Instant.parse("2026-11-06T21:00:00Z")

    @Test fun `el titulo de la semana, tambien si cruza de mes o de anio`() {
        assertEquals("SEMANA DEL 2 AL 8 NOV", weekTitle(LocalDate.parse("2026-11-02")))
        assertEquals("SEMANA DEL 26 OCT AL 1 NOV", weekTitle(LocalDate.parse("2026-10-26")))
        assertEquals("SEMANA DEL 28 DIC AL 3 ENE", weekTitle(LocalDate.parse("2026-12-28")))
    }

    @Test fun `la etiqueta del dia`() {
        assertEquals("LUN 02", dayLabel(LocalDate.parse("2026-11-02")))
        assertEquals("MIÉ 04", dayLabel(LocalDate.parse("2026-11-04")))
        assertEquals("DOM 08", dayLabel(LocalDate.parse("2026-11-08")))
    }

    @Test fun `la hora y el rango en hora de Argentina`() {
        assertEquals("18:00", hourLabel(friday))
        assertEquals("Vie 06/11 · 18:00–19:00", timeRangeLabel(friday))
        assertEquals("vie 06/11 a las 18:00", shortDayHourLabel(friday))
        // 23 h: el fin es medianoche.
        assertEquals("Dom 08/11 · 23:00–00:00", timeRangeLabel(Instant.parse("2026-11-09T02:00:00Z")))
    }

    @Test fun `la pregunta de cancelar usa el primer nombre`() {
        val appt = Appointment("a1", "s1", "Lucía Gómez", null, friday, AppointmentStatus.PENDING, null)
        assertEquals("¿Cancelar el turno de Lucía del vie 06/11 a las 18:00? Le avisamos.", cancelQuestion(appt))
    }

    @Test fun `la disponibilidad del dia`() {
        assertEquals(NO_AVAILABILITY, availabilityLabel(emptyList()))
        assertEquals("09–13 · 17–21", availabilityLabel(listOf(AvailabilitySlot(1, 17, 21), AvailabilitySlot(1, 9, 13))))
    }

    @Test fun `los estados en mono`() {
        assertEquals(listOf("PENDIENTE", "CONFIRMADO", "CANCELADO"), AppointmentStatus.entries.map(::statusLabel))
    }
}
