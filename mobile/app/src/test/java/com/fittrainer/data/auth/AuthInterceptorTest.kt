package com.fittrainer.data.auth

import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

/** Pablo #32 ronda 2, punto 3: una request con [RequiredUser] solo sale con esa cuenta, venga como venga. */
class AuthInterceptorTest {

    private val server = MockWebServer()
    private val store = FakeTokenStore()
    private val client = OkHttpClient.Builder().addInterceptor(AuthInterceptor(store)).build()

    @Before fun setUp() = server.start()

    @After fun tearDown() = server.shutdown()

    private fun call(path: String, owner: String? = null, header: String? = null): Int {
        val request = Request.Builder().url(server.url(path))
            .apply { owner?.let { tag(RequiredUser::class.java, RequiredUser(it)) } }
            .apply { header?.let { header(AuthInterceptor.AUTHORIZATION, it) } }
            .build()
        return client.newCall(request).execute().use { it.code }
    }

    @Test(expected = AccountChangedException::class)
    fun `con tag y sin sesion no sale`() {
        try {
            call("/api/sessions", owner = "u1")
        } finally {
            assertEquals(0, server.requestCount)
        }
    }

    @Test(expected = AccountChangedException::class)
    fun `con tag y header explicito de otra cuenta no sale`() {
        store.flow.value = authState() // "u1"
        try {
            call("/api/sessions", owner = "u2", header = "Bearer otro")
        } finally {
            assertEquals(0, server.requestCount)
        }
    }

    @Test(expected = AccountChangedException::class)
    fun `con tag en un endpoint de auth tampoco sale con otra cuenta`() {
        store.flow.value = authState()
        try {
            call("/api/auth/refresh", owner = "u2")
        } finally {
            assertEquals(0, server.requestCount)
        }
    }

    @Test fun `con tag de la cuenta logueada respeta el header explicito`() {
        store.flow.value = authState()
        server.enqueue(MockResponse())

        call("/api/sessions", owner = "u1", header = "Bearer explicito")

        assertEquals("Bearer explicito", server.takeRequest().getHeader("Authorization"))
    }

    @Test fun `sin tag y sin sesion sale sin Bearer como antes`() {
        server.enqueue(MockResponse())

        call("/api/students")

        assertNull(server.takeRequest().getHeader("Authorization"))
    }

    @Test fun `sin tag con sesion agrega el Bearer como antes`() {
        store.flow.value = authState()
        server.enqueue(MockResponse())

        call("/api/students")

        assertEquals("Bearer access-1", server.takeRequest().getHeader("Authorization"))
    }
}
