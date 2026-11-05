package com.fittrainer.ui.agenda.student.mine

import com.fittrainer.data.agenda.Appointment
import com.fittrainer.data.agenda.AppointmentStatus
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MyAppointmentsUiStateTest {

    private val now = Instant.parse("2026-11-04T12:00:00Z")

    private fun appt(id: String, at: String, status: AppointmentStatus = AppointmentStatus.PENDING) =
        Appointment(id, "u1", "", null, Instant.parse(at), status, null)

    @Test fun `el alumno cancela lo que no paso y nunca confirma`() {
        assertEquals(MyAppointmentActions.CANCEL, myActionsFor(appt("a", "2026-11-06T21:00:00Z"), now))
        assertEquals(MyAppointmentActions.CANCEL, myActionsFor(appt("a", "2026-11-06T21:00:00Z", AppointmentStatus.CONFIRMED), now))
        assertEquals(MyAppointmentActions.NONE, myActionsFor(appt("a", "2026-11-06T21:00:00Z", AppointmentStatus.CANCELLED), now))
        // Empieza justo ahora: ya pasó (scheduled_at <= ahora, como el backend).
        assertEquals(MyAppointmentActions.PAST, myActionsFor(appt("a", "2026-11-04T12:00:00Z"), now))
        assertEquals(MyAppointmentActions.NONE, myActionsFor(appt("a", "2026-11-03T21:00:00Z", AppointmentStatus.CANCELLED), now))
    }

    @Test fun `por fecha y los cancelados al final, tambien por fecha`() {
        val list = buildMyList(
            listOf(
                appt("c2", "2026-11-08T21:00:00Z", AppointmentStatus.CANCELLED),
                appt("b", "2026-11-07T21:00:00Z", AppointmentStatus.CONFIRMED),
                appt("c1", "2026-11-05T21:00:00Z", AppointmentStatus.CANCELLED),
                appt("a", "2026-11-06T21:00:00Z"),
            ),
            now,
        )
        assertEquals(listOf("a", "b", "c1", "c2"), list.map { it.appointment.id })
    }

    @Test fun `los estados de la pantalla`() {
        assertTrue(MyAppointmentsUiState(loaded = true).showLoading)
        assertTrue(MyAppointmentsUiState(loaded = true, failed = true).showError)
        assertTrue(MyAppointmentsUiState(loaded = true, offline = true).showNotLoaded)
        assertTrue(MyAppointmentsUiState(loaded = true, everSynced = true).showEmpty)
        // Sin red el aviso es el indicador de arriba, no el de "no pudimos actualizar".
        assertNull(MyAppointmentsUiState(loaded = true, everSynced = true, failed = true, offline = true).notice)
        assertFalse(MyAppointmentsUiState().showLoading)
    }
}
