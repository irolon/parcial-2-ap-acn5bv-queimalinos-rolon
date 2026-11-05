package com.fittrainer.data.agenda.student

import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.agenda.FakeAgendaApi
import com.fittrainer.testing.fakes.agenda.FakeStudentAgendaDao
import com.fittrainer.testing.fakes.agenda.apiErrorWithMessage
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import java.io.IOException
import java.time.Instant
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** Tarjeta 16: pedir un turno y cada rechazo del POST con su excepción. */
class StudentAppointmentsRequestTest {

    private val api = FakeAgendaApi()
    private val dao = FakeStudentAgendaDao()
    private val repo = StudentAppointmentsRepository(api, dao, MutableClock(Instant.parse("2026-11-04T12:00:00Z").toEpochMilli()))

    /** Vie 06/11 18:00 de Argentina. */
    private val friday = Instant.parse("2026-11-06T21:00:00Z")
    private val saturday = Instant.parse("2026-11-07T13:00:00Z")

    @Before fun setUp() = runTest {
        api.free += listOf("2026-11-06T21:00:00.000Z", "2026-11-07T13:00:00.000Z")
        repo.refreshMine("u1")
        repo.refreshFreeSlots("u1")
    }

    private suspend fun freeSlots() = repo.observeFreeSlots("u1").first()!!.slots

    @Test fun `pedir guarda el turno pendiente y saca el horario de los libres`() = runTest {
        val created = repo.request("u1", friday, "  Vengo con la rodilla  ").getOrThrow()
        assertEquals(AppointmentStatus.PENDING, created.status)
        assertEquals(friday, created.at)
        val body = api.createCalls.single()
        assertEquals("2026-11-06T18:00:00-03:00", body.scheduledAt)
        assertEquals("Vengo con la rodilla", body.notes)
        assertEquals(listOf(created.id), repo.observeMine("u1").first()!!.appointments.map { it.id })
        assertEquals(listOf(saturday), freeSlots())
    }

    @Test fun `una nota vacia o en blanco no viaja`() = runTest {
        repo.request("u1", friday, "   ").getOrThrow()
        repo.request("u1", saturday, null).getOrThrow()
        assertEquals(listOf(null, null), api.createCalls.map { it.notes })
    }

    @Test fun `SLOT_TAKEN trae el mensaje del backend y el horario sale de los libres`() = runTest {
        api.free.remove("2026-11-06T21:00:00.000Z")
        val error = repo.request("u1", friday, null).exceptionOrNull()
        assertEquals("Ese horario ya está ocupado", (error as SlotTakenException).message)
        assertEquals(listOf(saturday), freeSlots())
        assertTrue(repo.observeMine("u1").first()!!.appointments.isEmpty())
    }

    @Test fun `SLOT_UNAVAILABLE tambien saca el horario`() = runTest {
        api.createError = apiErrorWithMessage(400, "SLOT_UNAVAILABLE", "Ese horario está fuera de la disponibilidad de tu entrenador")
        val error = repo.request("u1", friday, null).exceptionOrNull()
        assertEquals("Ese horario está fuera de la disponibilidad de tu entrenador", (error as SlotUnavailableException).message)
        assertEquals(listOf(saturday), freeSlots())
    }

    @Test fun `el tope de pendientes da su excepcion y deja los libres`() = runTest {
        api.createError = apiErrorWithMessage(409, "APPOINTMENT_LIMIT", "Ya tenés 3 turnos pendientes: esperá a que tu entrenador los confirme")
        val error = repo.request("u1", friday, null).exceptionOrNull()
        assertTrue(error is AppointmentLimitException)
        assertEquals("Ya tenés 3 turnos pendientes: esperá a que tu entrenador los confirme", error!!.message)
        assertEquals(2, freeSlots().size)
    }

    @Test fun `un 403 al pedir es sin entrenador`() = runTest {
        api.createError = httpError(403, """{"error":{"code":"FORBIDDEN","message":"No tenés permiso para esta acción"}}""")
        assertTrue(repo.request("u1", friday, null).exceptionOrNull() is NoTrainerException)
    }

    @Test fun `sin el body del error el 409 usa el mensaje por defecto`() = runTest {
        api.createError = httpError(409, """{"error":{"code":"SLOT_TAKEN"}}""")
        assertEquals("Ese horario ya está ocupado", repo.request("u1", friday, null).exceptionOrNull()!!.message)
    }

    @Test fun `sin red es Offline y no toca Room`() = runTest {
        api.createError = IOException("sin red")
        val error = repo.request("u1", friday, "hola").exceptionOrNull() as DataException
        assertEquals(DataError.Offline, error.error)
        assertEquals(2, freeSlots().size)
        assertNull(repo.observeMine("u1").first()!!.appointments.firstOrNull())
    }

    @Test fun `la fecha viaja en hora de Argentina con su zona`() {
        assertEquals("2026-11-06T18:00:00-03:00", wireDateTime(friday))
        // Las 00 h de acá son las 03 h UTC del mismo día.
        assertEquals("2026-11-09T00:00:00-03:00", wireDateTime(Instant.parse("2026-11-09T03:00:00Z")))
    }
}
