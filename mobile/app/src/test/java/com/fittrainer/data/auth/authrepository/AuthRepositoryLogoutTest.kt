package com.fittrainer.data.auth.authrepository

import com.fittrainer.data.auth.AuthFile
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.auth.tokenstore.DataStoreTokenStore
import com.fittrainer.data.auth.tokenstore.SessionNotClosedException
import com.fittrainer.data.session.LogoutResult
import com.fittrainer.testing.fakes.auth.FakeAuthApi
import com.fittrainer.testing.fakes.auth.FakeDataStore
import com.fittrainer.testing.fakes.auth.FakeSessionTombstones
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.auth.fixedClock
import com.fittrainer.testing.fakes.auth.httpError
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthRepositoryLogoutTest {

    private val api = FakeAuthApi()
    private val store = FakeTokenStore()
    private val repo = AuthRepository(api, store, fixedClock())

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
