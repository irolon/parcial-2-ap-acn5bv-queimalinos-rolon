package com.fittrainer.data.students.detail

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.students.FakeStudentDetailApi
import com.fittrainer.testing.fakes.students.FakeTrainerStudentDetailDao
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainerStudentDetailRepositoryTest {

    private val api = FakeStudentDetailApi()
    private val dao = FakeTrainerStudentDetailDao()
    private val repo = TrainerStudentDetailRepository(api, dao, Clock.fixed(Instant.ofEpochMilli(9_000), ZoneOffset.UTC))

    private suspend fun cached() = repo.observe("t1", "s1").first()

    @Test fun `refresh guarda la ficha completa`() = runTest {
        assertTrue(repo.refresh("t1", "s1").isSuccess)
        val c = cached()!!
        assertEquals(LocalDate.of(1999, 5, 1), c.detail.birthDate)
        assertEquals(listOf("Mancuernas", "Banco"), c.detail.gymEquipment)
        assertEquals(23.5, c.detail.latestMetrics?.bmi)
        assertEquals(listOf("thursday", "monday"), c.detail.activeRoutine?.days)
        assertEquals(Instant.ofEpochMilli(9_000), c.fetchedAt)
    }

    @Test fun `error de red conserva lo guardado`() = runTest {
        repo.refresh("t1", "s1")
        api.error = IOException("sin red")
        val result = repo.refresh("t1", "s1")
        assertEquals(DataError.Offline, (result.exceptionOrNull() as DataException).error)
        assertEquals("Tomás Rivera", cached()?.detail?.name)
    }

    @Test fun `403 borra la ficha y la fila de la lista y devuelve NotFound`() = runTest {
        repo.refresh("t1", "s1")
        dao.listRows["t1" to "s1"] = Triple("Tomás Rivera", "strength", true)
        api.error = apiError(403, "FORBIDDEN")
        val result = repo.refresh("t1", "s1")
        assertEquals(DataError.NotFound, (result.exceptionOrNull() as DataException).error)
        assertNull(cached())
        assertFalse(("t1" to "s1") in dao.listRows)
    }

    @Test fun `update exitoso cambia la ficha y la fila de la lista`() = runTest {
        repo.refresh("t1", "s1")
        dao.listRows["t1" to "s1"] = Triple("Tomás Rivera", "strength", true)
        assertTrue(repo.update("t1", "s1", activePatch(false)).isSuccess)
        assertFalse(cached()!!.detail.active)
        assertEquals(false, dao.listRows["t1" to "s1"]?.third)
    }

    @Test fun `un GET que sale antes de la baja y llega despues no pisa la baja`() = runTest {
        repo.refresh("t1", "s1")
        api.getGate = CompletableDeferred()
        val slowRefresh = launch { repo.refresh("t1", "s1") }
        runCurrent()
        val disable = launch { repo.update("t1", "s1", activePatch(false)) }
        runCurrent()
        api.getGate!!.complete(Unit)
        slowRefresh.join()
        disable.join()
        assertFalse(cached()!!.detail.active)
    }

    @Test fun `update fallido no toca nada`() = runTest {
        repo.refresh("t1", "s1")
        api.error = IOException("sin red")
        assertTrue(repo.update("t1", "s1", activePatch(false)).isFailure)
        assertTrue(cached()!!.detail.active)
    }

    @Test fun `400 con details devuelve los campos`() = runTest {
        api.error = httpError(400, """{"error":{"code":"VALIDATION_ERROR","message":"x","details":[{"field":"birth_date","message":"No futura"}]}}""")
        val e = repo.update("t1", "s1", activePatch(true)).exceptionOrNull() as StudentRejectedException
        assertEquals(mapOf(EditField.BIRTH_DATE to "No futura"), e.fields)
    }

    @Test fun `otro entrenador no ve la ficha y clearUserData borra solo la suya`() = runTest {
        repo.refresh("t1", "s1")
        assertNull(repo.observe("t2", "s1").first())
        repo.clearUserData("t2")
        assertTrue(cached() != null)
        repo.clearUserData("t1")
        assertNull(cached())
    }
}
