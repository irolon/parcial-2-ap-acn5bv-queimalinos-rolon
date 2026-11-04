package com.fittrainer.data.api.auth

import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.api.LogoutRequest
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/** Lo que sale por la red en el logout (#72), con el mismo Json que NetworkModule. */
class LogoutRequestWireTest {
    private val server = MockWebServer()
    private lateinit var api: AuthApi

    @Before fun setUp() {
        server.start()
        api = Retrofit.Builder()
            .baseUrl(server.url("/api/"))
            .client(OkHttpClient())
            .addConverterFactory(Json { ignoreUnknownKeys = true }.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(AuthApi::class.java)
    }

    @After fun tearDown() = server.shutdown()

    // El backend rechaza push_token null con 400: sin token el campo no tiene que viajar.
    @Test fun `sin token de push no manda el campo`() = runTest {
        server.enqueue(MockResponse().setResponseCode(204))
        api.logout("Bearer a", LogoutRequest("r1"))
        assertEquals("""{"refresh_token":"r1"}""", server.takeRequest().body.readUtf8())
    }

    @Test fun `con token de push lo manda como push_token`() = runTest {
        server.enqueue(MockResponse().setResponseCode(204))
        api.logout("Bearer a", LogoutRequest("r1", "fcm-1"))
        assertEquals("""{"refresh_token":"r1","push_token":"fcm-1"}""", server.takeRequest().body.readUtf8())
    }

    @Test fun `el reintento sin access no manda Authorization`() = runTest {
        server.enqueue(MockResponse().setResponseCode(204))
        api.logout(null, LogoutRequest("r1"))
        assertNull(server.takeRequest().getHeader("Authorization"))
    }
}
