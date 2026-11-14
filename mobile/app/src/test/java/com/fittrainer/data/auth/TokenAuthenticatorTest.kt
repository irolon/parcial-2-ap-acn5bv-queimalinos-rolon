package com.fittrainer.data.auth

import com.fittrainer.data.api.RefreshResponse
import com.fittrainer.testing.fakes.auth.FakeAuthApi
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.auth.httpError
import java.io.IOException
import kotlinx.coroutines.runBlocking
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TokenAuthenticatorTest {

    private val api = FakeAuthApi()
    private val store = FakeTokenStore(authState())
    private val authenticator = TokenAuthenticator(store, api)

    private val sessionB = authState(access = "access-B", refresh = "refresh-B", session = "session-B")

    /** 401 de una request que salió con [token] desde la sesión [session] (null = sin tag, como lo haría el interceptor). */
    private fun unauthorized(token: String?, prior: Response? = null, session: String? = "session-1"): Response {
        val request = Request.Builder().url("http://localhost/api/students")
            .apply { token?.let { header("Authorization", "Bearer $it") } }
            .apply { session?.let { tag(SessionTag::class.java, SessionTag(it)) } }
            .build()
        return Response.Builder().request(request).protocol(Protocol.HTTP_1_1)
            .code(401).message("Unauthorized").priorResponse(prior).build()
    }

    private fun current() = runBlocking { store.current() }

    @Test fun `401 renueva y reintenta con el token nuevo`() {
        val retry = authenticator.authenticate(null, unauthorized("access-1"))

        assertEquals("Bearer access-2", retry?.header("Authorization"))
        assertEquals(SessionTag("session-1"), retry?.tag(SessionTag::class.java))
        assertEquals("access-2", current()?.accessToken)
        assertEquals("refresh-1", api.refreshCalls.single().refreshToken)
    }

    // GX1-M1: el refresh trae must_change_password; si viene, actualiza la sesión.
    @Test fun `refresh con la marca la pone en la sesion`() {
        api.refreshResponse = RefreshResponse("access-2", mustChangePassword = true)
        authenticator.authenticate(null, unauthorized("access-1"))
        assertEquals(true, current()?.user?.mustChangePassword)
        assertEquals("access-2", current()?.accessToken)
    }

    @Test fun `refresh con la marca en false la saca`() {
        store.flow.value = authState().let { it.copy(user = it.user.copy(mustChangePassword = true)) }
        api.refreshResponse = RefreshResponse("access-2", mustChangePassword = false)
        authenticator.authenticate(null, unauthorized("access-1"))
        assertEquals(false, current()?.user?.mustChangePassword)
    }

    @Test fun `refresh sin el campo no toca la marca`() {
        store.flow.value = authState().let { it.copy(user = it.user.copy(mustChangePassword = true)) }
        authenticator.authenticate(null, unauthorized("access-1"))
        assertEquals(true, current()?.user?.mustChangePassword)
    }

    // GX1-M1: un refresh que salió antes del cambio de clave y vuelve después no pisa el token nuevo ni la marca.
    @Test fun `refresh que vuelve despues del cambio de clave no pisa el token nuevo`() {
        store.flow.value = authState().let { it.copy(user = it.user.copy(mustChangePassword = true)) }
        api.refreshResponse = RefreshResponse("access-con-marca", mustChangePassword = true)
        api.onRefresh = {
            store.updateAccessToken("session-1", "access-clave-nueva")
            store.setMustChangePassword("session-1", false, accessToken = "access-clave-nueva")
        }
        val retry = authenticator.authenticate(null, unauthorized("access-1"))
        assertEquals("Bearer access-clave-nueva", retry?.header("Authorization"))
        assertEquals("access-clave-nueva", current()?.accessToken)
        assertEquals(false, current()?.user?.mustChangePassword)
    }

    @Test fun `refresh con 401 cierra la sesion`() {
        api.refreshError = httpError(401)
        assertNull(authenticator.authenticate(null, unauthorized("access-1")))
        assertNull(current())
    }

    // Review Focus 2: refresh con 400 → misma salida que 401, sin reintentos infinitos.
    @Test fun `refresh con 400 cierra la sesion`() {
        api.refreshError = httpError(400)
        assertNull(authenticator.authenticate(null, unauthorized("access-1")))
        assertNull(current())
    }

    @Test fun `refresh sin red no cierra la sesion`() {
        api.refreshError = IOException("sin red")
        assertNull(authenticator.authenticate(null, unauthorized("access-1")))
        assertEquals(authState(), current())
    }

    @Test fun `refresh con 500 no cierra la sesion`() {
        api.refreshError = httpError(500)
        assertNull(authenticator.authenticate(null, unauthorized("access-1")))
        assertEquals(authState(), current())
    }

    @Test fun `un reintento que vuelve a dar 401 no entra en bucle`() {
        val prior = unauthorized("access-1")
        assertNull(authenticator.authenticate(null, unauthorized("access-2", prior)))
        assertTrue(api.refreshCalls.isEmpty())
    }

    @Test fun `si otro hilo ya renovo reintenta sin pedir otro refresh`() {
        runBlocking { store.updateAccessToken("session-1", "access-2") }
        val retry = authenticator.authenticate(null, unauthorized("access-1"))
        assertEquals("Bearer access-2", retry?.header("Authorization"))
        assertTrue(api.refreshCalls.isEmpty())
    }

    @Test fun `request sin Bearer no se renueva`() {
        assertNull(authenticator.authenticate(null, unauthorized(null)))
        assertTrue(api.refreshCalls.isEmpty())
    }

    @Test fun `sin sesion guardada no se renueva`() {
        runBlocking { store.clear() }
        assertNull(authenticator.authenticate(null, unauthorized("access-1")))
        assertTrue(api.refreshCalls.isEmpty())
    }

    @Test fun `request sin SessionTag no se renueva`() {
        assertNull(authenticator.authenticate(null, unauthorized("access-1", session = null)))
        assertTrue(api.refreshCalls.isEmpty())
    }

    // Codex P1: A cerró sesión y entró B; el 401 de una request de A no se reintenta con el token de B.
    @Test fun `401 de la sesion A con la sesion B guardada no reintenta ni toca B`() {
        store.flow.value = sessionB
        assertNull(authenticator.authenticate(null, unauthorized("access-1")))
        assertTrue(api.refreshCalls.isEmpty())
        assertEquals(sessionB, current())
    }

    @Test fun `refresh de A que termina con B guardada no pisa B ni reintenta`() {
        api.onRefresh = { store.flow.value = sessionB }
        assertNull(authenticator.authenticate(null, unauthorized("access-1")))
        assertEquals(sessionB, current())
    }

    @Test fun `refresh rechazado de A con B guardada no cierra B`() {
        api.refreshError = httpError(401)
        api.onRefresh = { store.flow.value = sessionB }
        assertNull(authenticator.authenticate(null, unauthorized("access-1")))
        assertEquals(sessionB, current())
    }

    // El store da la sesión por cerrada en memoria aunque falle el disco; el authenticator no propaga esa falla.
    @Test fun `refresh rechazado con falla al borrar no lanza`() {
        api.refreshError = httpError(401)
        store.clearError = IllegalStateException("disco")
        assertNull(authenticator.authenticate(null, unauthorized("access-1")))
    }
}
