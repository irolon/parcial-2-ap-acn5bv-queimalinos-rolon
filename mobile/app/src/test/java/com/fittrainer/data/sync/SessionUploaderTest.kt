package com.fittrainer.data.sync

import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.auth.AuthInterceptor
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.pendingSet
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/** Por la cadena real de Retrofit, como en NetworkModule. */
class SessionUploaderTest {

    private val json = Json { ignoreUnknownKeys = true }
    private val server = MockWebServer()
    private lateinit var uploader: SessionUploader

    @Before fun setUp() {
        server.start()
        uploader = uploaderWith(OkHttpClient())
    }

    private fun uploaderWith(client: OkHttpClient) = SessionUploader(
        Retrofit.Builder()
            .baseUrl(server.url("/api/"))
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(SessionApi::class.java),
    )

    /** Con el AuthInterceptor real y "u1" (Ana) logueada. */
    private fun authenticatedUploader() =
        uploaderWith(OkHttpClient.Builder().addInterceptor(AuthInterceptor(FakeTokenStore(authState()))).build())

    @After fun tearDown() = server.shutdown()

    private fun created() = MockResponse().setResponseCode(201).setBody("""{"data":{}}""")
    private fun error(code: Int, errorCode: String = "X") =
        MockResponse().setResponseCode(code).setBody("""{"error":{"code":"$errorCode","message":"m"}}""")
    private fun setsOk(saved: List<String>, failed: String = "") = MockResponse().setBody(
        """{"data":{"saved":[${saved.joinToString(",") { """{"id":"$it","created":true}""" }}],"failed":[$failed]}}""",
    )

    @Test fun `sube la sesion terminada y despues sus series`() = runTest {
        server.enqueue(created())
        server.enqueue(setsOk(listOf("s1")))

        val result = uploader.upload("u1", finishedSession(), listOf(pendingSet("s1")))

        assertEquals(UploadResult(SetResults(synced = listOf("s1"))), result)
        val session = server.takeRequest()
        assertEquals("/api/sessions", session.path)
        val body = session.body.readUtf8()
        assertTrue(body, body.contains(""""id":"w1""""))
        assertTrue(body, body.contains(""""started_at":"2025-10-17T10:00:00Z""""))
        assertTrue(body, body.contains(""""finished_at":"2025-10-17T10:01:00Z""""))
        val sets = server.takeRequest()
        assertEquals("/api/sessions/w1/sets", sets.path)
        val setsBody = sets.body.readUtf8()
        assertTrue(setsBody, setsBody.contains(""""exercise_id":"ex-0""""))
        assertTrue(setsBody, setsBody.contains(""""executed_at":"2025-10-17T10:00:30.001Z""""))
    }

    @Test fun `si el reloj volvio atras finished_at sale igual a started_at`() = runTest {
        server.enqueue(created())
        val session = finishedSession().let { it.copy(finishedAt = it.startedAt - 5_000L) }

        uploader.upload("u1", session, emptyList())

        val body = server.takeRequest().body.readUtf8()
        assertTrue(body, body.contains(""""finished_at":"2025-10-17T10:00:00Z""""))
    }

    @Test fun `mas de 100 series van en dos lotes y el index es del lote`() = runTest {
        val sets = (0 until 101).map { pendingSet("s$it", setNumber = it % 100 + 1) }
        server.enqueue(created())
        server.enqueue(setsOk(sets.take(100).map { it.id }))
        // En el segundo lote la única serie (index 0 de ESE lote) es la s100.
        server.enqueue(setsOk(emptyList(), failed = """{"id":"s100","index":0,"code":"EXERCISE_NOT_FOUND","message":"m"}"""))

        val result = uploader.upload("u1", finishedSession(), sets)

        assertEquals(100, result.sets.synced.size)
        assertEquals(mapOf("s100" to "EXERCISE_NOT_FOUND"), result.sets.failed)
        assertEquals(null, result.stop)
        assertEquals(3, server.requestCount)
    }

    @Test fun `ids en minuscula en la respuesta se resuelven a los locales`() = runTest {
        server.enqueue(created())
        server.enqueue(setsOk(listOf("abc-def")))

        val result = uploader.upload("u1", finishedSession(), listOf(pendingSet("ABC-DEF")))

        assertEquals(listOf("ABC-DEF"), result.sets.synced)
    }

    @Test fun `409 al crear la sesion la rechaza sin mandar series`() = runTest {
        server.enqueue(error(409, "SESSION_ID_CONFLICT"))

        val result = uploader.upload("u1", finishedSession(), listOf(pendingSet("s1")))

        assertEquals(UploadResult(SetResults(), StopReason.SESSION_REJECTED, created = false), result)
        assertEquals(1, server.requestCount)
    }

    @Test fun `5xx en el segundo lote corta con RETRY y conserva el primero`() = runTest {
        val sets = (0 until 101).map { pendingSet("s$it", setNumber = it % 100 + 1) }
        server.enqueue(created())
        server.enqueue(setsOk(sets.take(100).map { it.id }))
        server.enqueue(error(503))

        val result = uploader.upload("u1", finishedSession(), sets)

        assertEquals(StopReason.RETRY, result.stop)
        assertEquals(100, result.sets.synced.size)
    }

    @Test fun `403 es definitivo y se distingue del 401`() = runTest {
        server.enqueue(error(403, "FORBIDDEN"))

        assertEquals(StopReason.FORBIDDEN, uploader.upload("u1", finishedSession(), listOf(pendingSet("s1"))).stop)
    }

    @Test fun `401 corta sin reintentar`() = runTest {
        server.enqueue(error(401, "UNAUTHORIZED"))

        assertEquals(StopReason.UNAUTHORIZED, uploader.upload("u1", finishedSession(), listOf(pendingSet("s1"))).stop)
    }

    @Test fun `404 en las series se reintenta`() = runTest {
        server.enqueue(created())
        server.enqueue(error(404, "SESSION_NOT_FOUND"))

        assertEquals(StopReason.RETRY, uploader.upload("u1", finishedSession(), listOf(pendingSet("s1"))).stop)
    }

    @Test fun `sin red se reintenta`() = runTest {
        server.shutdown()

        assertEquals(StopReason.RETRY, uploader.upload("u1", finishedSession(), listOf(pendingSet("s1"))).stop)
    }

    @Test fun `respuesta ilegible en las series se reintenta`() = runTest {
        server.enqueue(created())
        server.enqueue(MockResponse().setBody("not json"))

        assertEquals(StopReason.RETRY, uploader.upload("u1", finishedSession(), listOf(pendingSet("s1"))).stop)
    }

    // Pablo #32 punto 3: el tag del dueño llega al interceptor y frena la request de otra cuenta.
    @Test fun `con otra cuenta logueada la sesion no sale`() = runTest {
        val result = authenticatedUploader().upload("u2", finishedSession(), listOf(pendingSet("s1")))

        assertEquals(UploadResult(SetResults(), StopReason.ACCOUNT_CHANGED, created = false), result)
        assertEquals(0, server.requestCount)
    }

    @Test fun `con la cuenta duenia logueada sale con su Bearer`() = runTest {
        server.enqueue(created())
        server.enqueue(setsOk(listOf("s1")))

        val result = authenticatedUploader().upload("u1", finishedSession(), listOf(pendingSet("s1")))

        assertEquals(UploadResult(SetResults(synced = listOf("s1"))), result)
        assertEquals("Bearer access-1", server.takeRequest().getHeader("Authorization"))
    }

    @Test fun `400 en las series rechaza la sesion`() = runTest {
        server.enqueue(created())
        server.enqueue(error(400, "VALIDATION_ERROR"))

        assertEquals(StopReason.SESSION_REJECTED, uploader.upload("u1", finishedSession(), listOf(pendingSet("s1"))).stop)
    }
}
