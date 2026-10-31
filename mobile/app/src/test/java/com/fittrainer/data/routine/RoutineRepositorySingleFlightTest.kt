package com.fittrainer.data.routine

import com.fittrainer.data.api.MineResponse
import com.fittrainer.data.api.RoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.routineDto
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Hoy y Mis rutinas refrescan el mismo caché: dos pedidos a la vez no tienen que ir dos veces a la red. */
@OptIn(ExperimentalCoroutinesApi::class)
class RoutineRepositorySingleFlightTest {

    private val clock = Clock.fixed(Instant.ofEpochMilli(5_000L), ZoneOffset.UTC)
    private val api = FakeRoutineApi()
    private val repo = RoutineRepository(api, FakeRoutineDao(), clock)

    /** Primer pedido: espera el gate y falla. Los siguientes: una rutina. */
    private class FailsFirstApi : RoutineApi {
        var calls = 0
        val gate = CompletableDeferred<Unit>()
        override suspend fun mine(): MineResponse {
            calls++
            if (calls == 1) { gate.await(); throw IOException("sin red") }
            return MineResponse(listOf(routineDto()))
        }
    }

    @Test fun `dos refresh a la vez del mismo alumno hacen un solo pedido`() = runTest {
        api.gate = CompletableDeferred()
        val first = async { repo.refresh("u1") }
        val second = async { repo.refresh("u1") }
        runCurrent()
        assertEquals(1, api.calls)

        api.gate!!.complete(Unit)
        assertTrue(first.await().isSuccess)
        assertTrue(second.await().isSuccess)
        assertEquals(1, api.calls)
    }

    @Test fun `si el primero falla el que esperaba pide de nuevo`() = runTest {
        val failing = FailsFirstApi()
        val repo = RoutineRepository(failing, FakeRoutineDao(), clock)
        val first = async { repo.refresh("u1") }
        val second = async { repo.refresh("u1") }
        runCurrent()
        failing.gate.complete(Unit)

        assertTrue(first.await().isFailure)
        assertTrue(second.await().isSuccess)
        assertEquals(2, failing.calls)
    }

    @Test fun `un pedido de otro alumno no se aprovecha`() = runTest {
        api.gate = CompletableDeferred()
        val first = async { repo.refresh("u1") }
        val second = async { repo.refresh("u2") }
        runCurrent()
        api.gate!!.complete(Unit)

        assertTrue(first.await().isSuccess)
        assertTrue(second.await().isSuccess)
        assertEquals(2, api.calls)
    }

    @Test fun `dos refresh seguidos van los dos a la red`() = runTest {
        repo.refresh("u1")
        repo.refresh("u1")
        assertEquals(2, api.calls)
    }
}
