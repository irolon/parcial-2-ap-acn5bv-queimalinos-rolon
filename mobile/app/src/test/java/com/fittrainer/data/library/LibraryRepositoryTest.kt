package com.fittrainer.data.library

import com.fittrainer.data.api.LibraryResponse
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.library.FakeExerciseApi
import com.fittrainer.testing.fakes.library.FakeLibraryDao
import com.fittrainer.testing.fakes.library.libraryDto
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class LibraryRepositoryTest {

    private val clock = Clock.fixed(Instant.ofEpochMilli(5_000L), ZoneOffset.UTC)
    private val api = FakeExerciseApi()
    private val dao = FakeLibraryDao()
    private val repo = LibraryRepository(api, dao, clock)

    @Test fun `sin sync el cache sale vacio y sin fecha`() = runTest {
        val cache = repo.observeCache("u1").first()
        assertTrue(cache.exercises.isEmpty())
        assertNull(cache.lastSyncedAt)
    }

    @Test fun `refresh guarda la biblioteca con su duenio y la hora del dispositivo`() = runTest {
        api.response = LibraryResponse(listOf(libraryDto("ex-1"), libraryDto("ex-2")))
        assertTrue(repo.refresh("u1").isSuccess)

        val cache = repo.observeCache("u1").first()
        assertEquals(listOf("ex-1", "ex-2"), cache.exercises.map { it.id })
        assertEquals(Instant.ofEpochMilli(5_000L), cache.lastSyncedAt)
    }

    @Test fun `refresh reemplaza todo y un ejercicio borrado desaparece`() = runTest {
        api.response = LibraryResponse(listOf(libraryDto("ex-1"), libraryDto("ex-2")))
        repo.refresh("u1")
        api.response = LibraryResponse(listOf(libraryDto("ex-2")))
        repo.refresh("u1")

        assertEquals(listOf("ex-2"), repo.observeCache("u1").first().exercises.map { it.id })
    }

    @Test fun `refresh sin red devuelve Offline y no toca el cache`() = runTest {
        repo.refresh("u1")
        api.error = IOException("sin red")

        val result = repo.refresh("u1")

        assertEquals(DataError.Offline, (result.exceptionOrNull() as DataException).error)
        assertEquals(listOf("ex-1"), repo.observeCache("u1").first().exercises.map { it.id })
    }

    @Test fun `el cache de otro usuario se ve como nunca sincronizado`() = runTest {
        repo.refresh("u1")

        val other = repo.observeCache("u2").first()
        assertTrue(other.exercises.isEmpty())
        assertNull(other.lastSyncedAt)
    }

    @Test fun `clearUserData borra solo si el cache es de ese usuario`() = runTest {
        repo.refresh("u1")
        repo.clearUserData("u2")
        assertEquals(1, repo.observeCache("u1").first().exercises.size)

        repo.clearUserData("u1")
        assertTrue(repo.observeCache("u1").first().exercises.isEmpty())
    }

    // Review Focus 1: el refresh que termina después del logout queda con el dueño viejo.
    @Test fun `refresh que termina despues de cerrar sesion no se le muestra a otro`() =
        runTest(UnconfinedTestDispatcher()) {
            val gate = CompletableDeferred<Unit>()
            api.gate = gate
            val inFlight = launch { repo.refresh("u1") }

            repo.clearUserData("u1")
            gate.complete(Unit)
            inFlight.join()

            val next = repo.observeCache("u2").first()
            assertTrue(next.exercises.isEmpty())
            assertNull(next.lastSyncedAt)
        }
}
