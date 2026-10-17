package com.fittrainer.data.auth

import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.data.api.AuthApi
import com.fittrainer.testing.fakes.auth.authState
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class AuthNetworkIntegrationTest {

    private val server = MockWebServer()
    private val store = FakeTokenStore(authState())
    private lateinit var client: OkHttpClient

    @Before fun setUp() {
        server.start()
        val authApi = Retrofit.Builder()
            .baseUrl(server.url("/api/"))
            .client(OkHttpClient())
            .addConverterFactory(Json { ignoreUnknownKeys = true }.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(AuthApi::class.java)
        client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(store))
            .authenticator(TokenAuthenticator(store, authApi))
            .build()
    }

    @After fun tearDown() = server.shutdown()

    private fun get(path: String): Int =
        client.newCall(Request.Builder().url(server.url(path)).build()).execute().use { it.code }

    @Test fun `agrega el Bearer a una llamada protegida`() {
        server.enqueue(MockResponse().setBody("ok"))
        get("/api/students")
        assertEquals("Bearer access-1", server.takeRequest().getHeader("Authorization"))
    }

    @Test fun `no agrega Bearer a login ni refresh`() {
        server.enqueue(MockResponse().setBody("{}"))
        server.enqueue(MockResponse().setBody("{}"))
        get("/api/auth/login")
        get("/api/auth/refresh")
        assertNull(server.takeRequest().getHeader("Authorization"))
        assertNull(server.takeRequest().getHeader("Authorization"))
    }

    @Test fun `sin sesion no agrega header`() {
        runBlocking { store.clear() }
        server.enqueue(MockResponse().setBody("ok"))
        get("/api/students")
        assertNull(server.takeRequest().getHeader("Authorization"))
    }

    @Test fun `no pisa un Authorization explicito`() {
        server.enqueue(MockResponse().setBody("ok"))
        client.newCall(
            Request.Builder().url(server.url("/api/x")).header("Authorization", "Bearer explicito").build()
        ).execute().close()
        assertEquals("Bearer explicito", server.takeRequest().getHeader("Authorization"))
    }

    @Test fun `401 dispara refresh y reintenta con el token nuevo`() {
        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(MockResponse().setBody("""{"token":"access-2","expires_in":"1h"}"""))
        server.enqueue(MockResponse().setBody("ok"))

        assertEquals(200, get("/api/students"))

        val first = server.takeRequest()
        val refresh = server.takeRequest()
        val retry = server.takeRequest()
        assertEquals("Bearer access-1", first.getHeader("Authorization"))
        assertEquals("/api/auth/refresh", refresh.path)
        assertNull(refresh.getHeader("Authorization"))
        assertTrue(refresh.body.readUtf8().contains("\"refresh_token\":\"refresh-1\""))
        assertEquals("Bearer access-2", retry.getHeader("Authorization"))
        assertEquals("access-2", runBlocking { store.current() }?.accessToken)
    }

    @Test fun `dos 401 simultaneos producen un solo refresh`() {
        val refreshes = AtomicInteger()
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse = when {
                request.path == "/api/auth/refresh" -> {
                    refreshes.incrementAndGet()
                    // Demora: la segunda llamada recibe su 401 mientras el refresh está en curso.
                    MockResponse().setBody("""{"token":"access-2"}""").setBodyDelay(300, TimeUnit.MILLISECONDS)
                }
                request.getHeader("Authorization") == "Bearer access-2" -> MockResponse().setBody("ok")
                else -> MockResponse().setResponseCode(401)
            }
        }

        val codes = runBlocking {
            (1..2).map { async(Dispatchers.IO) { get("/api/students") } }.awaitAll()
        }

        assertEquals(listOf(200, 200), codes)
        assertEquals(1, refreshes.get())
    }

    // Codex P1: el 401 llega cuando la cuenta ya cambió; no se reenvía con el token de la otra cuenta.
    @Test fun `401 de una request de otra sesion no se reintenta con la sesion actual`() {
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse =
                if (request.getHeader("Authorization") == "Bearer access-1") {
                    store.flow.value = authState(access = "access-B", refresh = "refresh-B", session = "session-B")
                    MockResponse().setResponseCode(401)
                } else {
                    MockResponse().setBody("ok")
                }
        }

        assertEquals(401, get("/api/students"))
        assertEquals(1, server.requestCount)
        assertEquals("access-B", runBlocking { store.current() }?.accessToken)
    }
}
