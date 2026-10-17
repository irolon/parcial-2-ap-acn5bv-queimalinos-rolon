package com.fittrainer.data.routine

import com.fittrainer.data.api.MineResponse
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.routineDto
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response

class RoutineRepositoryTest {

    private val clock = Clock.fixed(Instant.ofEpochMilli(5_000L), ZoneOffset.UTC)
    private val api = FakeRoutineApi()
    private val dao = FakeRoutineDao()
    private val repo = RoutineRepository(api, dao, clock)

    @Test fun `sin sync el cache sale vacio y sin fecha`() = runTest {
        val cache = repo.observeCache("u1").first()
        assertTrue(cache.routines.isEmpty())
        assertNull(cache.lastSyncedAt)
    }

    @Test fun `refresh guarda las rutinas con su duenio y la hora del dispositivo`() = runTest {
        assertTrue(repo.refresh("u1").isSuccess)

        val cache = repo.observeCache("u1").first()
        assertEquals(listOf("rt-1"), cache.routines.map { it.id })
        assertEquals(1, cache.routines.single().exercises.size)
        assertEquals(Instant.ofEpochMilli(5_000L), cache.lastSyncedAt)
        assertEquals("u1", dao.state.value.sync?.ownerId)
    }

    @Test fun `refresh reemplaza todo y una rutina desactivada desaparece`() = runTest {
        api.response = MineResponse(listOf(routineDto("rt-1"), routineDto("rt-2")))
        repo.refresh("u1")
        api.response = MineResponse(listOf(routineDto("rt-2")))
        repo.refresh("u1")

        assertEquals(listOf("rt-2"), repo.observeCache("u1").first().routines.map { it.id })
    }

    @Test fun `refresh sin red devuelve Offline y no toca el cache`() = runTest {
        repo.refresh("u1")
        api.error = IOException("sin red")

        val result = repo.refresh("u1")

        assertEquals(DataError.Offline, (result.exceptionOrNull() as DataException).error)
        assertEquals(listOf("rt-1"), repo.observeCache("u1").first().routines.map { it.id })
    }

    @Test fun `refresh con 500 devuelve Http y no toca el cache`() = runTest {
        repo.refresh("u1")
        api.error = HttpException(Response.error<Any>(500, "".toResponseBody(null)))

        val result = repo.refresh("u1")

        assertEquals(DataError.Http(500), (result.exceptionOrNull() as DataException).error)
        assertEquals(1, repo.observeCache("u1").first().routines.size)
    }

    // La sesión anterior terminó sin "Cerrar sesión" y entra otra persona.
    @Test fun `el cache de otro usuario se ve como nunca sincronizado`() = runTest {
        repo.refresh("u1")

        val other = repo.observeCache("u2").first()
        assertTrue(other.routines.isEmpty())
        assertNull(other.lastSyncedAt)
    }

    @Test fun `clearUserData del duenio deja el cache vacio`() = runTest {
        repo.refresh("u1")
        repo.clearUserData("u1")

        val cache = repo.observeCache("u1").first()
        assertTrue(cache.routines.isEmpty())
        assertNull(cache.lastSyncedAt)
    }
}
