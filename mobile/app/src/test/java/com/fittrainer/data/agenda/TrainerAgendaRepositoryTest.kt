package com.fittrainer.data.agenda

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.agenda.FakeAgendaApi
import com.fittrainer.testing.fakes.agenda.FakeTrainerAgendaDao
import com.fittrainer.testing.fakes.agenda.appointmentDto
import com.fittrainer.testing.fakes.agenda.slotDto
import com.fittrainer.testing.fakes.auth.MutableClock
import java.io.IOException
import java.time.LocalDate
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainerAgendaRepositoryTest {

    private val api = FakeAgendaApi()
    private val dao = FakeTrainerAgendaDao()
    private val repo = TrainerAgendaRepository(api, dao, MutableClock(1_000))
    private val week = LocalDate.parse("2026-11-02")
    private val next = LocalDate.parse("2026-11-09")

    private suspend fun ids(start: LocalDate = week) = repo.observeWeek("t1", start).first()!!.appointments.map { it.id }

    @Test fun `una semana que nunca se bajo es null y despues trae sus turnos por hora`() = runTest {
        assertNull(repo.observeWeek("t1", week).first())
        api.appointments += appointmentDto("vie", "2026-11-06T21:00:00.000Z")
        api.appointments += appointmentDto("mie", "2026-11-04T22:00:00.000Z", status = "confirmed")
        assertTrue(repo.refreshWeek("t1", week).isSuccess)
        val cache = repo.observeWeek("t1", week).first()!!
        assertEquals(listOf("mie", "vie"), cache.appointments.map { it.id })
        assertEquals(AppointmentStatus.CONFIRMED, cache.appointments.first().status)
        assertEquals(1_000L, cache.fetchedAt.toEpochMilli())
        assertEquals("2026-11-02" to "2026-11-08", api.weekCalls.single())
    }

    @Test fun `una semana vacia que se bajo no es null`() = runTest {
        repo.refreshWeek("t1", week)
        assertEquals(emptyList<String>(), ids())
    }

    // El domingo 22 h de Argentina ya es lunes en UTC: tiene que quedar en la semana del domingo.
    @Test fun `el refresco reemplaza solo la semana pedida`() = runTest {
        api.appointments += appointmentDto("dom", "2026-11-09T01:00:00.000Z")
        api.appointments += appointmentDto("lun", "2026-11-09T13:00:00.000Z")
        repo.refreshWeek("t1", week)
        repo.refreshWeek("t1", next)
        assertEquals(listOf("dom"), ids())
        assertEquals(listOf("lun"), ids(next))
        api.appointments.removeAll { it.id == "dom" }
        repo.refreshWeek("t1", week)
        assertEquals(emptyList<String>(), ids())
        assertEquals(listOf("lun"), ids(next))
    }

    @Test fun `la disponibilidad reemplaza todas sus filas`() = runTest {
        assertNull(repo.observeAvailability("t1").first())
        repo.refreshAvailability("t1")
        assertEquals(3, repo.observeAvailability("t1").first()!!.slots.size)
        api.slots = listOf(slotDto(2, "08:00", "10:00"))
        repo.refreshAvailability("t1")
        assertEquals(listOf(AvailabilitySlot(2, 8, 10)), repo.observeAvailability("t1").first()!!.slots)
    }

    @Test fun `el PATCH guarda el turno que devuelve el servidor`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-06T21:00:00.000Z")
        repo.refreshWeek("t1", week)
        assertTrue(repo.updateStatus("t1", "a1", AppointmentStatus.CONFIRMED).isSuccess)
        assertEquals(AppointmentStatus.CONFIRMED, repo.observeWeek("t1", week).first()!!.appointments.single().status)
        assertEquals("a1" to "confirmed", api.patchCalls.single())
    }

    @Test fun `un 409 da conflicto con el mensaje del backend`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-06T21:00:00.000Z", status = "cancelled")
        val error = repo.updateStatus("t1", "a1", AppointmentStatus.CONFIRMED).exceptionOrNull()
        assertTrue(error is AppointmentConflictException)
        assertEquals("No se puede pasar el turno a ese estado", error!!.message)
    }

    @Test fun `un turno pasado da conflicto`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-03T21:00:00.000Z")
        val error = repo.updateStatus("t1", "a1", AppointmentStatus.CANCELLED).exceptionOrNull()
        assertEquals("El turno ya pasó", (error as AppointmentConflictException).message)
    }

    @Test fun `un 403 saca el turno de Room y da gone`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-06T21:00:00.000Z")
        repo.refreshWeek("t1", week)
        api.appointments.clear()
        assertTrue(repo.updateStatus("t1", "a1", AppointmentStatus.CANCELLED).exceptionOrNull() is AppointmentGoneException)
        assertEquals(emptyList<String>(), ids())
    }

    @Test fun `sin red es Offline y no toca Room`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-06T21:00:00.000Z")
        repo.refreshWeek("t1", week)
        api.writeError = IOException("sin red")
        val error = repo.updateStatus("t1", "a1", AppointmentStatus.CONFIRMED).exceptionOrNull() as DataException
        assertEquals(DataError.Offline, error.error)
        assertEquals(AppointmentStatus.PENDING, repo.observeWeek("t1", week).first()!!.appointments.single().status)
    }

    @Test fun `un estado desconocido se guarda tal cual y se ve como cancelado`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-06T21:00:00.000Z", status = "no_show", name = null)
        repo.refreshWeek("t1", week)
        assertEquals("no_show", dao.appointments.value.single().status)
        val appt = repo.observeWeek("t1", week).first()!!.appointments.single()
        assertEquals(AppointmentStatus.CANCELLED, appt.status)
        assertEquals(STUDENT_FALLBACK_NAME, appt.studentName)
    }

    @Test fun `cerrar sesion borra el cache del entrenador o todo`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-06T21:00:00.000Z")
        repo.refreshWeek("t1", week)
        repo.refreshAvailability("t1")
        repo.refreshWeek("t2", week)
        repo.clearUserData("t1")
        assertNull(repo.observeWeek("t1", week).first())
        assertNull(repo.observeAvailability("t1").first())
        assertTrue(dao.appointments.value.none { it.trainerId == "t1" })
        assertEquals(listOf("a1"), repo.observeWeek("t2", week).first()!!.appointments.map { it.id })
        repo.clearUserData(null)
        assertNull(repo.observeWeek("t2", week).first())
    }
}
