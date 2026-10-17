package com.fittrainer.data.auth

import com.fittrainer.data.FakeAuthApi
import com.fittrainer.data.FakeDataStore
import com.fittrainer.data.FakeSessionTombstones
import com.fittrainer.data.FakeTokenStore
import com.fittrainer.data.fixedClock
import com.fittrainer.data.api.LoginRequest
import com.fittrainer.data.api.UserDto
import com.fittrainer.data.authState
import com.fittrainer.data.httpError
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.LogoutResult
import com.fittrainer.data.session.Role
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthRepositoryTest {

    private val api = FakeAuthApi()
    private val store = FakeTokenStore()
    private val repo = AuthRepository(api, store, fixedClock())

    private fun Result<*>.dataError() = (exceptionOrNull() as DataException).error

    @Test fun `login ok guarda tokens y usuario`() = runTest {
        val result = repo.login("ana@test.com", "Secreta123")

        assertEquals(AuthUser("u1", "Ana", "ana@test.com", Role.STUDENT), result.getOrNull())
        val saved = store.current()!!
        assertEquals(authState(session = saved.sessionId), saved)
        assertEquals(listOf(LoginRequest("ana@test.com", "Secreta123")), api.loginCalls)
    }

    @Test fun `cada login genera un sessionId nuevo`() = runTest {
        repo.login("ana@test.com", "Secreta123")
        val first = store.current()!!.sessionId
        repo.login("ana@test.com", "Secreta123")
        val second = store.current()!!.sessionId
        assertTrue(first.isNotBlank())
        assertNotEquals(first, second)
    }

    @Test fun `login de entrenador guarda rol TRAINER`() = runTest {
        api.loginResponse = api.loginResponse.copy(user = UserDto("t1", "Pablo", "p@test.com", "trainer"))
        repo.login("p@test.com", "Secreta123")
        assertEquals(Role.TRAINER, store.current()?.user?.role)
    }

    @Test fun `401 es credenciales invalidas y no guarda nada`() = runTest {
        api.loginError = httpError(401)
        val result = repo.login("ana@test.com", "mala")
        assertEquals(DataError.InvalidCredentials, result.dataError())
        assertNull(store.current())
    }

    @Test fun `sin red es Offline`() = runTest {
        api.loginError = IOException("sin red")
        assertEquals(DataError.Offline, repo.login("ana@test.com", "x").dataError())
    }

    @Test fun `500 es Http 500`() = runTest {
        api.loginError = httpError(500)
        assertEquals(DataError.Http(500), repo.login("ana@test.com", "x").dataError())
    }

    // Review Focus 1: rol desconocido -> Unknown, sin sesión a medias.
    @Test fun `rol desconocido es Unknown y no guarda nada`() = runTest {
        api.loginResponse = api.loginResponse.copy(user = UserDto("x", "X", "x@test.com", "admin"))
        val result = repo.login("x@test.com", "Secreta123")
        assertEquals(DataError.Unknown, result.dataError())
        assertNull(store.current())
    }

    @Test fun `falla al guardar la sesion es Unknown, no Offline`() = runTest {
        store.saveError = IOException("disco")
        assertEquals(DataError.Unknown, repo.login("ana@test.com", "Secreta123").dataError())
    }

    // Codex P2 (ronda 3): el cierre local no persistido se informa, y se revoca igual.
    @Test fun `logout con cierre local no persistido es Incomplete y aun revoca en el backend`() = runTest {
        store.save(authState())
        store.clearError = SessionNotClosedException(IOException("disco"))
        assertEquals(LogoutResult.Incomplete, repo.logout())
        assertEquals("refresh-1", api.logoutCalls.single().second.refreshToken)
    }

    @Test fun `logout borra la sesion y revoca con el refresh token`() = runTest {
        store.save(authState())
        assertEquals(LogoutResult.Closed, repo.logout())
        assertNull(store.current())
        assertEquals("Bearer access-1", api.logoutCalls.single().first)
        assertEquals("refresh-1", api.logoutCalls.single().second.refreshToken)
    }

    @Test fun `logout borra la sesion aunque la API falle`() = runTest {
        store.save(authState())
        api.logoutError = IOException("sin red")
        repo.logout()
        assertNull(store.current())
    }

    @Test fun `logout sin sesion no llama a la API`() = runTest {
        repo.logout()
        assertTrue(api.logoutCalls.isEmpty())
    }

    // Codex P2: con el access vencido el logout da 401; se renueva y se revoca igual.
    @Test fun `logout con 401 renueva y reintenta la revocacion con el access nuevo`() = runTest {
        store.save(authState())
        api.logoutCodes += 401

        repo.logout()

        assertNull(store.current())
        assertEquals("refresh-1", api.refreshCalls.single().refreshToken)
        assertEquals(listOf("Bearer access-1", "Bearer access-2"), api.logoutCalls.map { it.first })
        assertEquals("refresh-1", api.logoutCalls.last().second.refreshToken)
    }

    @Test fun `logout con 401 y refresh fallido no lanza y la sesion queda cerrada`() = runTest {
        store.save(authState())
        api.logoutCodes += 401
        api.refreshError = httpError(401)

        repo.logout()

        assertNull(store.current())
        assertEquals(1, api.logoutCalls.size)
    }

    @Test fun `logout con 500 no renueva`() = runTest {
        store.save(authState())
        api.logoutCodes += 500
        repo.logout()
        assertTrue(api.refreshCalls.isEmpty())
        assertEquals(1, api.logoutCalls.size)
    }

    // Codex P2 (ronda 2): un error transitorio de lectura no puede cancelar el logout.
    @Test fun `logout con error de lectura igual cierra la sesion y no revoca`() = runTest {
        store.save(authState())
        store.readError = IOException("disco ilegible")

        assertEquals(LogoutResult.Closed, repo.logout())

        assertEquals(1, store.clearCalls)
        assertNull(store.current())
        assertTrue(api.logoutCalls.isEmpty())
    }

    @Test fun `logout con error de lectura no deja reaparecer la sesion al recuperarse el disco`() = runTest {
        val dataStore = FakeDataStore(AuthFile(authState()))
        val tombstones = FakeSessionTombstones()
        val realStore = DataStoreTokenStore(dataStore, tombstones)
        dataStore.readFailures = 1
        dataStore.failWrites = true

        assertEquals(LogoutResult.Closed, AuthRepository(api, realStore, fixedClock()).logout())
        dataStore.failWrites = false

        assertNull(realStore.read())
        assertNull(DataStoreTokenStore(dataStore, tombstones).read())
    }
}
