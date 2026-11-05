package com.fittrainer.data.agenda.student

import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.testing.fakes.agenda.FakeAgendaApi
import com.fittrainer.testing.fakes.agenda.FakeStudentAgendaDao
import com.fittrainer.testing.fakes.agenda.appointmentDto
import com.fittrainer.testing.fakes.auth.MutableClock
import java.time.Instant
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Lo mismo que en la agenda del PT (E10 y E13): un GET que salió antes de cancelar no pisa el estado nuevo en Room,
 * y un GET que vuelve después de cerrar sesión no repuebla Room con los datos del alumno. Y (ronda 2 de Codex) un
 * refresco de A que sale cuando ya entró B no sale con el JWT de B ni guarda nada bajo A.
 */
class StudentAppointmentsRaceTest {

    private val api = FakeAgendaApi()
    private val dao = FakeStudentAgendaDao()
    private val repo = StudentAppointmentsRepository(api, dao, MutableClock(Instant.parse("2026-11-04T12:00:00Z").toEpochMilli()))

    @Test fun `un GET atrasado no pisa un turno recien cancelado`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-06T21:00:00.000Z")
        val gate = CompletableDeferred<Unit>()
        api.weekGate = gate
        launch { repo.refreshMine("u1") }
        runCurrent()
        api.weekGate = null
        launch { repo.cancel("u1", "a1") }
        runCurrent()
        gate.complete(Unit)
        advanceUntilIdle()
        assertEquals(AppointmentStatus.CANCELLED, repo.observeMine("u1").first()!!.appointments.single().status)
    }

    @Test fun `los libres que vuelven despues de cerrar sesion no se guardan`() = runTest {
        api.free += "2026-11-06T21:00:00.000Z"
        val gate = CompletableDeferred<Unit>()
        api.freeGate = gate
        var result: Result<Unit>? = null
        launch { result = repo.refreshFreeSlots("u1") }
        runCurrent()
        repo.clearUserData(null)
        gate.complete(Unit)
        advanceUntilIdle()
        assertNull(repo.observeFreeSlots("u1").first())
        assertEquals(true, result?.isFailure)
    }

    @Test fun `despues de cerrar sesion los pedidos nuevos guardan normalmente`() = runTest {
        api.free += "2026-11-06T21:00:00.000Z"
        repo.clearUserData("u1")
        repo.refreshFreeSlots("u1").getOrThrow()
        repo.request("u1", Instant.parse("2026-11-06T21:00:00Z"), null).getOrThrow()
        assertEquals(1, dao.appointments.value.size)
        assertEquals(emptyList<Instant>(), repo.observeFreeSlots("u1").first()!!.slots)
    }

    @Test fun `un refresco de A con B logueado no sale ni guarda nada bajo A`() = runTest {
        api.appointments += appointmentDto("b1", "2026-11-06T21:00:00.000Z")
        api.loggedIn = "B"
        val mine = repo.refreshMine("A")
        val free = repo.refreshFreeSlots("A")
        assertEquals(true, mine.isFailure && free.isFailure)
        assertEquals(listOf("A", "A"), api.owners)
        assertNull(repo.observeMine("A").first())
        assertNull(repo.observeFreeSlots("A").first())
    }

    @Test fun `cada pedido del alumno lleva su cuenta`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-06T21:00:00.000Z")
        api.loggedIn = "u1"
        repo.refreshMine("u1").getOrThrow()
        repo.refreshFreeSlots("u1").getOrThrow()
        repo.cancel("u1", "a1").getOrThrow()
        assertEquals(listOf("u1", "u1", "u1"), api.owners)
    }
}
