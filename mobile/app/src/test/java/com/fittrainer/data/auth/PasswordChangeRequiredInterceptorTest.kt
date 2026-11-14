package com.fittrainer.data.auth

import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** GX1-M1: un 403 PASSWORD_CHANGE_REQUIRED pone la marca en la sesión que hizo el pedido, y solo en esa. */
class PasswordChangeRequiredInterceptorTest {

    private val server = MockWebServer()
    private val store = FakeTokenStore(authState())
    private val client = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor(store))
        .addInterceptor(PasswordChangeRequiredInterceptor(store))
        .build()

    private val required = """{"error":{"code":"PASSWORD_CHANGE_REQUIRED","message":"Tenés que elegir una contraseña nueva"}}"""

    @Before fun setUp() = server.start()

    @After fun tearDown() = server.shutdown()

    private fun marked() = runBlocking { store.current()!!.user.mustChangePassword }

    private fun respond(code: Int, body: String) = server.enqueue(MockResponse().setResponseCode(code).setBody(body))

    /** Pedido como lo arma Retrofit; [tagged] arma uno que salió con otra sesión o con otro access. */
    private fun call(tagged: Pair<String, String>? = null): Pair<Int, String> {
        val request = Request.Builder().url(server.url("/api/sessions"))
            .apply {
                tagged?.let { (session, access) ->
                    header(AuthInterceptor.AUTHORIZATION, "Bearer $access")
                    tag(SessionTag::class.java, SessionTag(session))
                }
            }
            .build()
        return client.newCall(request).execute().use { it.code to it.body!!.string() }
    }

    @Test fun `un 403 PASSWORD_CHANGE_REQUIRED marca la sesion y el body sigue legible`() {
        respond(403, required)

        val (code, body) = call()

        assertTrue(marked())
        assertEquals(403, code)
        assertEquals(required, body)
    }

    @Test fun `un 403 FORBIDDEN no marca nada`() {
        respond(403, """{"error":{"code":"FORBIDDEN","message":"No tenés permiso"}}""")
        call()
        assertFalse(marked())
    }

    @Test fun `un 403 sin body legible no marca nada`() {
        respond(403, "<html>proxy</html>")
        call()
        assertFalse(marked())
    }

    @Test fun `otro status con el mismo codigo no marca`() {
        respond(400, required)
        call()
        assertFalse(marked())
    }

    @Test fun `un 403 de una sesion que ya no es la actual no marca`() {
        respond(403, required)
        call(tagged = "session-vieja" to "access-1")
        assertFalse(marked())
    }

    // El cambio de clave ya guardó un access nuevo: el 403 de un pedido que salió con el viejo no vuelve a marcar.
    @Test fun `un 403 de un access viejo de la misma sesion no marca`() {
        respond(403, required)
        call(tagged = "session-1" to "access-viejo")
        assertFalse(marked())
    }

    @Test fun `sin sesion no marca ni falla`() {
        runBlocking { store.clear() }
        respond(403, required)
        assertEquals(403, call().first)
    }
}
