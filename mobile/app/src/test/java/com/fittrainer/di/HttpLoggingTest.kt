package com.fittrainer.di

import com.fittrainer.data.TOKEN
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** El log HTTP de debug no puede filtrar credenciales: ni el token de invitación del path ni contraseñas. */
class HttpLoggingTest {

    private val server = MockWebServer()
    private val logs = mutableListOf<String>()
    private lateinit var client: OkHttpClient

    @Before fun setUp() {
        server.start()
        // Mismo interceptor que arma NetworkModule, con un logger que captura en vez de imprimir.
        client = OkHttpClient.Builder().addInterceptor(httpLogging { logs += it }).build()
    }

    @After fun tearDown() = server.shutdown()

    private fun execute(request: Request) = client.newCall(request).execute().close()

    @Test fun `GET de la invitacion no imprime el token`() {
        server.enqueue(MockResponse().setBody("{}"))
        execute(Request.Builder().url(server.url("/api/invitations/$TOKEN")).build())

        assertTrue(logs.any { it.contains("/api/invitations/") })
        assertFalse(logs.any { it.contains(TOKEN) })
    }

    @Test fun `alta del alumno no imprime token ni contraseña`() {
        server.enqueue(MockResponse().setResponseCode(201).setBody("{}"))
        val body = """{"token":"$TOKEN","password":"Secreta123"}""".toRequestBody("application/json".toMediaType())
        execute(Request.Builder().url(server.url("/api/students")).post(body).build())

        assertFalse(logs.any { it.contains(TOKEN) || it.contains("Secreta123") })
    }

    @Test fun `redacta el token en el path y en el parametro token`() {
        assertEquals(
            "--> GET http://h/api/invitations/[redactado] (12ms)",
            redactUrlSecrets("--> GET http://h/api/invitations/$TOKEN (12ms)"),
        )
        assertEquals(
            "http://h/join?token=[redactado]&x=1",
            redactUrlSecrets("http://h/join?token=$TOKEN&x=1"),
        )
    }

    @Test fun `deja intactas las urls sin secretos`() {
        assertEquals("--> GET http://h/api/health", redactUrlSecrets("--> GET http://h/api/health"))
    }
}
