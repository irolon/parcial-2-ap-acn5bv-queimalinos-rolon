package com.fittrainer.data.agenda

import com.fittrainer.testing.fakes.agenda.FakeAgendaApi
import com.fittrainer.testing.fakes.agenda.FakeTrainerAgendaDao
import com.fittrainer.testing.fakes.agenda.appointmentDto
import com.fittrainer.testing.fakes.auth.MutableClock
import java.time.LocalDate
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
 * Lo que Codex encontró en E10: un GET que salió antes de confirmar no pisa el estado nuevo en Room. Y en E13: un
 * GET que vuelve después de cerrar sesión no repuebla Room.
 */
class TrainerAgendaRepositoryRaceTest {

    private val api = FakeAgendaApi()
    private val repo = TrainerAgendaRepository(api, FakeTrainerAgendaDao(), MutableClock(0))
    private val week = LocalDate.parse("2026-11-02")

    @Test fun `un GET atrasado de la semana no pisa un turno recien confirmado`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-06T21:00:00.000Z")
        val gate = CompletableDeferred<Unit>()
        api.weekGate = gate
        launch { repo.refreshWeek("t1", week) }
        runCurrent()
        api.weekGate = null
        launch { repo.updateStatus("t1", "a1", AppointmentStatus.CONFIRMED) }
        runCurrent()
        gate.complete(Unit)
        advanceUntilIdle()
        assertEquals(AppointmentStatus.CONFIRMED, repo.observeWeek("t1", week).first()!!.appointments.single().status)
    }

    @Test fun `un GET que vuelve despues de cerrar sesion no guarda nada`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-06T21:00:00.000Z")
        val gate = CompletableDeferred<Unit>()
        api.weekGate = gate
        var result: Result<Unit>? = null
        launch { result = repo.refreshWeek("t1", week) }
        runCurrent()
        repo.clearUserData(null)
        gate.complete(Unit)
        advanceUntilIdle()
        assertNull(repo.observeWeek("t1", week).first())
        assertEquals(true, result?.isFailure)
    }

    @Test fun `despues de cerrar sesion los pedidos nuevos guardan normalmente`() = runTest {
        api.appointments += appointmentDto("a1", "2026-11-06T21:00:00.000Z")
        repo.clearUserData("t1")
        repo.refreshWeek("t1", week).getOrThrow()
        assertEquals(1, repo.observeWeek("t1", week).first()!!.appointments.size)
    }
}
