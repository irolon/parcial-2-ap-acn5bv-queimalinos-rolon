package com.fittrainer.data.invitation

import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.TOKEN
import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.api.InvitationApi
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.testing.fakes.auth.fixedClock
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/** Endpoints públicos por la cadena real de Retrofit, como en NetworkModule (cliente sin Bearer). */
class InvitationNetworkIntegrationTest {

    private val json = Json { ignoreUnknownKeys = true }
    private val server = MockWebServer()
    private lateinit var retrofit: Retrofit

    @Before fun setUp() {
        server.start()
        retrofit = Retrofit.Builder()
            .baseUrl(server.url("/api/"))
            .client(OkHttpClient())
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }

    @After fun tearDown() = server.shutdown()

    @Test fun `GET invitations parsea la respuesta real del backend`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """{"trainer":{"id":"t1","name":"Laura","specialty":null,"avatar_url":null},
                   "student_name":"Tomás Rivera","student_email":"tomas@test.com","goal":"hypertrophy",
                   "expires_at":"2026-10-17T12:00:00.123456+00:00"}""",
            ),
        )
        val result = InvitationRepository(retrofit.create(InvitationApi::class.java)).get(TOKEN)

        assertEquals("Laura", result.getOrThrow().trainerName)
        val request = server.takeRequest()
        assertEquals("/api/invitations/$TOKEN", request.path)
        assertNull(request.getHeader("Authorization"))
    }

    @Test fun `GET invitations acepta una invitacion sin objetivo`() = runTest {
        // Desde la web el objetivo es opcional: el backend manda null (o puede omitirlo).
        for (goal in listOf("\"goal\":null,", "")) {
            server.enqueue(
                MockResponse().setBody(
                    """{"trainer":{"id":"t1","name":"Laura"},"student_name":"Tomás","student_email":"t@test.com",
                       $goal"expires_at":"2026-10-17T12:00:00+00:00"}""",
                ),
            )
            val result = InvitationRepository(retrofit.create(InvitationApi::class.java)).get(TOKEN)

            assertNull(result.getOrThrow().goal)
        }
    }

    @Test fun `POST students manda token y password y guarda la sesion`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(201).setBody(
                """{"student":{"id":"s1","trainer_id":"t1","name":"Tomás Rivera","email":"tomas@test.com","goal":"hypertrophy"},
                   "token":"access-s","refresh_token":"refresh-s"}""",
            ),
        )
        val store = FakeTokenStore()
        val repo = AuthRepository(retrofit.create(AuthApi::class.java), store, fixedClock())

        assertTrue(repo.registerFromInvitation(TOKEN, "Secreta123").isSuccess)

        val request = server.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/students", request.path)
        assertEquals("""{"token":"$TOKEN","password":"Secreta123"}""", request.body.readUtf8())
        assertNull(request.getHeader("Authorization"))
        assertEquals("access-s", store.current()?.accessToken)
    }
}
