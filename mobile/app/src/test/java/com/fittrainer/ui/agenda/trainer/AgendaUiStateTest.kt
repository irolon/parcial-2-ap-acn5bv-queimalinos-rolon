package com.fittrainer.ui.agenda.trainer

import com.fittrainer.data.agenda.Appointment
import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.data.agenda.AvailabilitySlot
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AgendaUiStateTest {

    private val now = Instant.parse("2026-11-04T12:00:00Z")
    private val week = LocalDate.parse("2026-11-02")

    private fun appt(id: String, at: String, status: AppointmentStatus = AppointmentStatus.PENDING) =
        Appointment(id, "s-$id", "Lucía", null, Instant.parse(at), status, null)

    @Test fun `las acciones segun el estado y si ya paso`() {
        assertEquals(AppointmentActions.CONFIRM_OR_CANCEL, actionsFor(appt("a", "2026-11-06T21:00:00Z"), now))
        assertEquals(AppointmentActions.CANCEL, actionsFor(appt("a", "2026-11-06T21:00:00Z", AppointmentStatus.CONFIRMED), now))
        assertEquals(AppointmentActions.NONE, actionsFor(appt("a", "2026-11-06T21:00:00Z", AppointmentStatus.CANCELLED), now))
        // Empieza justo ahora: ya pasó (scheduled_at <= ahora, como el backend).
        assertEquals(AppointmentActions.PAST, actionsFor(appt("a", "2026-11-04T12:00:00Z"), now))
        assertEquals(AppointmentActions.PAST, actionsFor(appt("a", "2026-11-03T21:00:00Z", AppointmentStatus.CANCELLED), now))
    }

    // El domingo 23 h de Argentina (lunes 02 h UTC) va en la tarjeta del domingo.
    @Test fun `cada turno cae en su dia de Argentina, por hora`() {
        val list = listOf(
            appt("tarde", "2026-11-06T22:00:00Z"),
            appt("temprano", "2026-11-06T12:00:00Z"),
            appt("dom", "2026-11-09T02:00:00Z"),
        )
        val days = buildDays(week, LocalDate.parse("2026-11-04"), list, null, showCancelled = false)
        assertEquals(listOf("temprano", "tarde"), days[4].appointments.map { it.id })
        assertEquals(listOf("dom"), days[6].appointments.map { it.id })
        assertTrue(days[2].isToday)
        assertNull(days[0].availability)
    }

    @Test fun `la disponibilidad va por dia y los cancelados solo si se piden`() {
        val list = listOf(appt("c", "2026-11-02T13:00:00Z", AppointmentStatus.CANCELLED))
        val slots = listOf(AvailabilitySlot(1, 9, 13), AvailabilitySlot(3, 17, 21))
        val hidden = buildDays(week, week, list, slots, showCancelled = false)
        assertEquals("09–13", hidden[0].availability)
        assertEquals(NO_AVAILABILITY, hidden[1].availability)
        assertEquals("17–21", hidden[2].availability)
        assertTrue(hidden[0].appointments.isEmpty())
        assertEquals(listOf("c"), buildDays(week, week, list, slots, showCancelled = true)[0].appointments.map { it.id })
    }

    @Test fun `estados de la pantalla sin cache`() {
        val base = AgendaUiState(loaded = true)
        assertTrue(base.showLoading)
        assertTrue(base.copy(failed = true).showError)
        assertTrue(base.copy(offline = true, failed = true).showNotLoaded)
        assertNull(base.copy(failed = true).notice)
        assertEquals(AGENDA_REFRESH_FAILED, base.copy(everSynced = true, failed = true).notice)
    }
}
