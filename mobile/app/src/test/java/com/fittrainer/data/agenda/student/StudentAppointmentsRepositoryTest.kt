package com.fittrainer.data.agenda.student

import com.fittrainer.data.agenda.AppointmentConflictException
import com.fittrainer.data.agenda.AppointmentGoneException
import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.data.db.agenda.student.StudentAppointmentEntity
import com.fittrainer.testing.fakes.agenda.FakeAgendaApi
import com.fittrainer.testing.fakes.agenda.FakeStudentAgendaDao
import com.fittrainer.testing.fakes.agenda.appointmentDto
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import java.time.Instant
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Tarjeta 16: los turnos del alumno y los horarios libres, en Room. Hoy es el miércoles 04/11, 09:00 de Argentina. */
class StudentAppointmentsRepositoryTest {

    private val api = FakeAgendaApi()
    private val dao = FakeStudentAgendaDao()
    private val clock = MutableClock(Instant.parse("2026-11-04T12:00:00Z").toEpochMilli())
    private val repo = StudentAppointmentsRepository(api, dao, clock)

    private suspend fun ids() = repo.observeMine("u1").first()!!.appointments.map { it.id }

    @Test fun `los turnos nunca bajados son null y despues salen de hoy a 60 dias, por hora`() = runTest {
        assertNull(repo.observeMine("u1").first())
        api.appointments += appointmentDto("vie", "2026-11-06T21:00:00.000Z")
        api.appointments += appointmentDto("jue", "2026-11-05T22:00:00.000Z", status = "confirmed", notes = "Rodilla")
        assertTrue(repo.refreshMine("u1").isSuccess)
        val cache = repo.observeMine("u1").first()!!
        assertEquals(listOf("jue", "vie"), cache.appointments.map { it.id })
        assertEquals(AppointmentStatus.CONFIRMED, cache.appointments.first().status)
        assertEquals("Rodilla", cache.appointments.first().notes)
        assertEquals("2026-11-04" to "2027-01-03", api.weekCalls.single())
    }

    @Test fun `una bajada vacia no es null`() = runTest {
        repo.refreshMine("u1")
        assertEquals(emptyList<String>(), ids())
    }

    @Test fun `el refresco reemplaza solo la ventana y lo de antes de hoy no se ve`() = runTest {
        val ayer = Instant.parse("2026-11-03T21:00:00Z").toEpochMilli()
        val lejos = Instant.parse("2027-02-01T21:00:00Z").toEpochMilli()
        dao.upsertAppointments(listOf(entity("ayer", ayer), entity("lejos", lejos), entity("viejo", Instant.parse("2026-11-10T21:00:00Z").toEpochMilli())))
        api.appointments += appointmentDto("vie", "2026-11-06T21:00:00.000Z")
        repo.refreshMine("u1")
        assertEquals(listOf("vie", "lejos"), ids())
        assertTrue(dao.appointments.value.any { it.id == "ayer" })
    }

    @Test fun `los libres reemplazan la bajada anterior`() = runTest {
        assertNull(repo.observeFreeSlots("u1").first())
        api.free += listOf("2026-11-06T22:00:00.000Z", "2026-11-06T21:00:00.000Z")
        repo.refreshFreeSlots("u1").getOrThrow()
        val first = repo.observeFreeSlots("u1").first()!!
        assertEquals(listOf(Instant.parse("2026-11-06T21:00:00Z"), Instant.parse("2026-11-06T22:00:00Z")), first.slots)
        assertEquals("2026-11-04" to "2026-12-01", api.freeCalls.single())
        api.free.clear()
        repo.refreshFreeSlots("u1")
        assertEquals(emptyList<Instant>(), repo.observeFreeSlots("u1").first()!!.slots)
    }

    @Test fun `un 403 en los libres es sin entrenador`() = runTest {
        api.error = httpError(403, """{"error":{"code":"FORBIDDEN","message":"No tenés permiso"}}""")
        assertTrue(repo.refreshFreeSlots("u1").exceptionOrNull() is NoTrainerException)
    }

    @Test fun `cancelar guarda el turno que devuelve el servidor`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-06T21:00:00.000Z", status = "confirmed")
        repo.refreshMine("u1")
        assertTrue(repo.cancel("u1", "a1").isSuccess)
        assertEquals(AppointmentStatus.CANCELLED, repo.observeMine("u1").first()!!.appointments.single().status)
        assertEquals("a1" to "cancelled", api.patchCalls.single())
    }

    @Test fun `cancelar uno ya cancelado o pasado da conflicto con el mensaje del backend`() = runTest {
        api.appointments += appointmentDto("can", "2026-11-06T21:00:00.000Z", status = "cancelled")
        api.appointments += appointmentDto("old", "2026-11-03T21:00:00.000Z")
        assertEquals("No se puede pasar el turno a ese estado", (repo.cancel("u1", "can").exceptionOrNull() as AppointmentConflictException).message)
        assertEquals("El turno ya pasó", (repo.cancel("u1", "old").exceptionOrNull() as AppointmentConflictException).message)
    }

    @Test fun `cancelar con 403 saca el turno de Room y da gone`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-06T21:00:00.000Z")
        repo.refreshMine("u1")
        api.appointments.clear()
        assertTrue(repo.cancel("u1", "a1").exceptionOrNull() is AppointmentGoneException)
        assertEquals(emptyList<String>(), ids())
    }

    @Test fun `cerrar sesion borra lo del alumno o todo`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-06T21:00:00.000Z")
        api.free += "2026-11-06T22:00:00.000Z"
        repo.refreshMine("u1")
        repo.refreshFreeSlots("u1")
        repo.refreshMine("u2")
        repo.clearUserData("u1")
        assertNull(repo.observeMine("u1").first())
        assertNull(repo.observeFreeSlots("u1").first())
        assertTrue(dao.appointments.value.none { it.studentId == "u1" })
        assertTrue(dao.slots.value.isEmpty())
        assertEquals(listOf("a1"), repo.observeMine("u2").first()!!.appointments.map { it.id })
        repo.clearUserData(null)
        assertNull(repo.observeMine("u2").first())
    }

    private fun entity(id: String, at: Long) = StudentAppointmentEntity("u1", id, "t1", at, "pending", null, 0)
}
