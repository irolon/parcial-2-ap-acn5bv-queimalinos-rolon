package com.fittrainer.data.repository

import com.fittrainer.testing.fakes.FakeHealthApi
import com.fittrainer.testing.fakes.FakeHealthDao
import com.fittrainer.data.db.HealthSnapshotEntity
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.SerializationException
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import retrofit2.Response
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class HealthRepositoryTest {

    private val clock = Clock.fixed(Instant.ofEpochMilli(1_000L), ZoneOffset.UTC)
    private val cached = HealthSnapshotEntity(
        status = "ok", version = "0.0.9", serverTimestamp = "2026-10-12T10:00:00.000Z", fetchedAt = 500L,
    )

    @Test fun `observe devuelve null sin cache`() = runTest {
        val repo = HealthRepository(FakeHealthApi(), FakeHealthDao(), clock)
        assertNull(repo.observe().first())
    }

    @Test fun `refresh exitoso guarda en Room con la hora del dispositivo`() = runTest {
        val dao = FakeHealthDao()
        val repo = HealthRepository(FakeHealthApi(), dao, clock)

        val result = repo.refresh()

        assertTrue(result.isSuccess)
        assertEquals(
            HealthSnapshot("ok", "0.1.0", "2026-10-13T12:00:00.000Z", fetchedAt = 1_000L),
            repo.observe().first(),
        )
    }

    @Test fun `refresh sin red devuelve failure y no toca el cache`() = runTest {
        val dao = FakeHealthDao(cached)
        val repo = HealthRepository(FakeHealthApi(error = IOException("sin red")), dao, clock)

        val result = repo.refresh()

        assertEquals(DataError.Offline, (result.exceptionOrNull() as DataException).error)
        assertEquals(cached, dao.state.value)
    }

    // Review Focus 2: body que no es el JSON esperado → failure, sin crash, cache intacto.
    @Test fun `refresh con body invalido no toca el cache`() = runTest {
        val dao = FakeHealthDao(cached)
        val repo = HealthRepository(FakeHealthApi(error = SerializationException("html")), dao, clock)

        val result = repo.refresh()

        assertEquals(DataError.Unknown, (result.exceptionOrNull() as DataException).error)
        assertEquals(cached, dao.state.value)
    }

    @Test fun `refresh con error HTTP se mapea a Http con el codigo`() = runTest {
        val dao = FakeHealthDao(cached)
        val http = HttpException(Response.error<Any>(500, "".toResponseBody(null)))
        val repo = HealthRepository(FakeHealthApi(error = http), dao, clock)

        val result = repo.refresh()

        assertEquals(DataError.Http(500), (result.exceptionOrNull() as DataException).error)
        assertEquals(cached, dao.state.value)
    }
}
