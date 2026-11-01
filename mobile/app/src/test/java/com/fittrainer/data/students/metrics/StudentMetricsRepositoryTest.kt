package com.fittrainer.data.students.metrics

import com.fittrainer.data.api.students.CreateMetricRequest
import com.fittrainer.testing.fakes.students.FakeMetricsApi
import com.fittrainer.testing.fakes.students.FakeTrainerStudentMetricsDao
import com.fittrainer.testing.fakes.students.metricDto
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class StudentMetricsRepositoryTest {

    private val api = FakeMetricsApi()
    private val dao = FakeTrainerStudentMetricsDao()
    private val repo = StudentMetricsRepository(api, dao, Clock.fixed(Instant.ofEpochMilli(5_000), ZoneOffset.UTC))

    private suspend fun ids() = repo.observe("t1", "s").first().metrics.map { it.id }

    @Test fun `refresh guarda el historial de la mas nueva a la mas vieja`() = runTest {
        api.server["m1"] = metricDto("m1", "2026-10-01T13:00:00Z")
        api.server["m2"] = metricDto("m2", "2026-10-20T13:00:00Z")
        repo.refresh("t1", "s")
        assertEquals(listOf("m2", "m1"), ids())
        assertEquals(Instant.ofEpochMilli(5_000), repo.observe("t1", "s").first().fetchedAt)
        assertEquals(23.5, repo.observe("t1", "s").first().metrics.first().bmi!!, 0.0)
    }

    @Test fun `add guarda lo que devolvio el servidor y un reintento con el mismo id no duplica`() = runTest {
        val request = CreateMetricRequest("m9", "2026-11-01T10:00:00-03:00", weightKg = 80.5)
        repo.add("t1", "s", request)
        repo.add("t1", "s", request)
        assertEquals(listOf("m9"), ids())
        assertEquals(1, api.server.size)
        assertEquals(24.1, repo.observe("t1", "s").first().metrics.single().bmi!!, 0.0)
    }

    @Test fun `delete con 204 y con 404 la saca del cache`() = runTest {
        api.server["m1"] = metricDto("m1")
        api.server["m2"] = metricDto("m2", "2026-10-21T13:00:00Z")
        repo.refresh("t1", "s")
        assertTrue(repo.delete("t1", "s", "m1").isSuccess)
        api.server.remove("m2")
        assertTrue(repo.delete("t1", "s", "m2").isSuccess)
        assertTrue(ids().isEmpty())
    }

    @Test fun `delete con otro error o sin red no toca el cache`() = runTest {
        api.server["m1"] = metricDto("m1")
        repo.refresh("t1", "s")
        api.deleteCode = 500
        assertTrue(repo.delete("t1", "s", "m1").isFailure)
        api.deleteCode = null
        api.error = IOException("sin red")
        assertTrue(repo.delete("t1", "s", "m1").isFailure)
        assertTrue(repo.add("t1", "s", CreateMetricRequest("x", "2026-11-01T10:00:00-03:00", weightKg = 1.0)).isFailure)
        assertEquals(listOf("m1"), ids())
    }

    @Test fun `un GET que salio antes de la baja y llega despues no la vuelve a poner`() = runTest {
        api.server["m1"] = metricDto("m1")
        repo.refresh("t1", "s")
        api.listGate = CompletableDeferred()
        val slow = launch { repo.refresh("t1", "s") }
        runCurrent()
        val delete = launch { repo.delete("t1", "s", "m1") }
        runCurrent()
        api.listGate!!.complete(Unit)
        api.listGate = null
        slow.join()
        delete.join()
        assertTrue(ids().isEmpty())
    }

    @Test fun `borrar la unica altura actualiza el IMC de las otras medidas`() = runTest {
        api.server["alt"] = metricDto("alt", "2026-10-01T13:00:00Z", weight = null)
        api.server["peso"] = metricDto("peso", "2026-10-20T13:00:00Z")
        api.onDelete = { api.server["peso"] = api.server.getValue("peso").copy(bmi = null) }
        repo.refresh("t1", "s")
        repo.delete("t1", "s", "alt")
        assertNull(repo.observe("t1", "s").first().metrics.single().bmi)
    }

    @Test fun `cargar una medida rebaja el historial`() = runTest {
        repo.refresh("t1", "s")
        val before = api.listCalls
        repo.add("t1", "s", CreateMetricRequest("m9", "2026-10-01T12:00:00-03:00", heightCm = 178.0))
        assertEquals(before + 1, api.listCalls)
    }

    @Test fun `otro entrenador no ve nada y clearUserData borra solo lo suyo`() = runTest {
        api.server["m1"] = metricDto("m1")
        repo.refresh("t1", "s")
        assertTrue(repo.observe("t2", "s").first().metrics.isEmpty())
        assertNull(repo.observe("t2", "s").first().fetchedAt)
        repo.clearUserData("t2")
        assertEquals(1, ids().size)
        repo.clearUserData("t1")
        assertTrue(ids().isEmpty())
    }
}
