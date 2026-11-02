package com.fittrainer.data.templates.trainer

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.testing.fakes.templates.templateDto
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainerTemplatesRepositoryTest {

    private val api = FakeTrainerTemplatesApi()
    private val routines = TrainerRoutinesRepository(FakeTrainerRoutinesApi(), FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val repo = TrainerTemplatesRepository(api, FakeTrainerTemplatesDao(), routines, Clock.fixed(Instant.ofEpochMilli(7_000), ZoneOffset.UTC))

    @Test fun `sin refresh la lista es null`() = runTest {
        assertNull(repo.observeList("t1").first())
    }

    @Test fun `la lista se ordena por nombre y trae dias y cantidad`() = runTest {
        api.server["tp0"] = templateDto("tp0", "Abdominales")
        repo.refreshList("t1")
        val cache = repo.observeList("t1").first()!!
        assertEquals(listOf("Abdominales", "Fuerza 3 días"), cache.templates.map { it.name })
        assertEquals(2, cache.templates.last().exerciseCount)
        assertEquals(Instant.ofEpochMilli(7_000), cache.fetchedAt)
    }

    @Test fun `el refresh de la lista conserva el detalle de las que siguen y borra las que no`() = runTest {
        api.server["tp2"] = templateDto("tp2", "Otra")
        repo.refreshTemplate("t1", "tp1")
        repo.refreshList("t1")
        api.server.remove("tp2")
        repo.refreshList("t1")
        assertNotNull(repo.observeTemplate("t1", "tp1").first())
        assertEquals(listOf("tp1"), repo.observeList("t1").first()!!.templates.map { it.id })
    }

    @Test fun `el detalle trae los ejercicios en orden`() = runTest {
        repo.refreshTemplate("t1", "tp1")
        val d = repo.observeTemplate("t1", "tp1").first()!!
        assertEquals(listOf("Press de banca", "Sentadilla"), d.exercises.map { it.name })
        assertTrue(d.exercises.all { it.available })
    }

    @Test fun `404 saca la plantilla del cache y devuelve NotFound`() = runTest {
        repo.refreshTemplate("t1", "tp1")
        api.server.remove("tp1")
        val result = repo.refreshTemplate("t1", "tp1")
        assertEquals(DataError.NotFound, (result.exceptionOrNull() as DataException).error)
        assertNull(repo.observeTemplate("t1", "tp1").first())
    }

    @Test fun `409 al asignar devuelve el mensaje del backend`() = runTest {
        api.instantiateError = httpError(409, """{"error":{"code":"TEMPLATE_EXERCISES_UNAVAILABLE","message":"La plantilla tiene ejercicios que ya no están disponibles"}}""")
        val result = repo.instantiate("t1", "tp1", "s1", "Fuerza", listOf("monday"))
        assertEquals("La plantilla tiene ejercicios que ya no están disponibles", (result.exceptionOrNull() as TemplateRejectedException).messageText)
    }

    @Test fun `403 del alumno no borra la plantilla`() = runTest {
        repo.refreshTemplate("t1", "tp1")
        api.instantiateError = apiError(403, "FORBIDDEN")
        val result = repo.instantiate("t1", "tp1", "s9", "Fuerza", listOf("monday"))
        assertEquals(DataError.Http(403), (result.exceptionOrNull() as DataException).error)
        assertNotNull(repo.observeTemplate("t1", "tp1").first())
    }

    @Test fun `asignar devuelve el id y la rutina queda en el cache de rutinas`() = runTest {
        val id = repo.instantiate("t1", "tp1", "s1", "Fuerza de Ana", listOf("monday", "friday")).getOrThrow()
        val routine = routines.observeRoutine("t1", id).first()!!
        assertEquals("Fuerza de Ana", routine.routine.name)
        assertEquals(listOf("monday", "friday"), api.instantiates.single().second.days)
    }

    @Test fun `guardar como plantilla refresca la lista`() = runTest {
        repo.refreshList("t1")
        assertTrue(repo.saveFromRoutine("t1", "r1", "Push base", "beginner").isSuccess)
        assertEquals("beginner", api.fromRoutines.single().level)
        assertTrue(repo.observeList("t1").first()!!.templates.any { it.name == "Push base" })
    }

    @Test fun `sin red conserva lo guardado`() = runTest {
        repo.refreshList("t1")
        api.error = IOException("sin red")
        val result = repo.refreshList("t1")
        assertEquals(DataError.Offline, (result.exceptionOrNull() as DataException).error)
        assertFalse(repo.observeList("t1").first()!!.templates.isEmpty())
    }
}
