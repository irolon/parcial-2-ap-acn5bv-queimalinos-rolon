package com.fittrainer.data.routines.trainer

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.routines.routineDto
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class TrainerRoutinesRepositoryReadTest {

    private val api = FakeTrainerRoutinesApi()
    private val dao = FakeTrainerRoutinesDao()
    private val repo = TrainerRoutinesRepository(api, dao, Clock.fixed(Instant.ofEpochMilli(9_000), ZoneOffset.UTC))

    private suspend fun list(student: String = "s1") = repo.observeStudentRoutines("t1", student).first()
    private suspend fun detail(id: String = "r1") = repo.observeRoutine("t1", id).first()

    @Test fun `sin refresh la lista es null (nunca se bajo)`() = runTest {
        assertNull(list())
    }

    @Test fun `refreshList guarda las rutinas del alumno, activas primero`() = runTest {
        api.server["r0"] = routineDto("r0", active = false).copy(createdAt = "2026-10-20T12:00:00+00:00")
        api.server["r2"] = routineDto("r2").copy(createdAt = "2026-10-25T12:00:00Z")
        repo.refreshList("t1", "s1")
        val cache = list()!!
        assertEquals(listOf("r2", "r1", "r0"), cache.routines.map { it.id })
        assertEquals(Instant.ofEpochMilli(9_000), cache.fetchedAt)
        assertEquals(listOf("monday", "thursday"), cache.routines.first().days)
    }

    @Test fun `refreshList borra la que ya no vino y su detalle, sin tocar otro alumno`() = runTest {
        api.server["x1"] = routineDto("x1", studentId = "s2")
        repo.refreshList("t1", "s1")
        repo.refreshList("t1", "s2")
        repo.refreshRoutine("t1", "r1")
        api.server.remove("r1")
        repo.refreshList("t1", "s1")
        assertEquals(emptyList<String>(), list()!!.routines.map { it.id })
        assertNull(detail())
        assertEquals(listOf("x1"), list("s2")!!.routines.map { it.id })
    }

    @Test fun `refreshList conserva el detalle de las que siguen`() = runTest {
        repo.refreshRoutine("t1", "r1")
        repo.refreshList("t1", "s1")
        assertEquals(listOf("re1", "re2"), detail()!!.exercises.map { it.id })
    }

    @Test fun `el detalle trae los ejercicios en orden`() = runTest {
        api.server["r1"] = routineDto(exercises = listOf(com.fittrainer.testing.fakes.routines.exerciseDto("b", 1), com.fittrainer.testing.fakes.routines.exerciseDto("a", 0)))
        repo.refreshRoutine("t1", "r1")
        val d = detail()!!
        assertEquals(listOf("a", "b"), d.exercises.map { it.id })
        assertEquals(90, d.exercises.first().restSeconds)
        assertEquals("Ejercicio a", d.exercises.first().name)
    }

    @Test fun `error de red conserva lo guardado`() = runTest {
        repo.refreshRoutine("t1", "r1")
        api.error = IOException("sin red")
        val result = repo.refreshRoutine("t1", "r1")
        assertEquals(DataError.Offline, (result.exceptionOrNull() as DataException).error)
        assertNotNull(detail())
    }

    @Test fun `403 borra la rutina del cache y devuelve NotFound`() = runTest {
        repo.refreshRoutine("t1", "r1")
        api.error = apiError(403, "FORBIDDEN")
        val result = repo.refreshRoutine("t1", "r1")
        assertEquals(DataError.NotFound, (result.exceptionOrNull() as DataException).error)
        assertNull(detail())
        assertEquals(0, dao.exercises.value.size)
    }

    @Test fun `cerrar sesion borra solo lo del entrenador`() = runTest {
        repo.refreshRoutine("t1", "r1")
        repo.clearUserData("t1")
        assertNull(detail())
    }
}
