package com.fittrainer.data.auth.tokenstore.datastoretokenstore

import com.fittrainer.data.auth.AuthState
import com.fittrainer.data.auth.tokenstore.DataStoreTokenStore
import java.io.IOException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class DataStoreTokenStoreBasicsTest : DataStoreTokenStoreTestBase() {

    @Test fun `updateAccessToken de otra sesion no pisa la guardada`() = runTest {
        store.save(sessionB)
        store.updateAccessToken("session-A", "access-2")
        assertEquals(sessionB, store.current())
    }

    @Test fun `updateAccessToken de la misma sesion cambia solo el access`() = runTest {
        store.save(sessionA)
        store.updateAccessToken("session-A", "access-2")
        assertEquals(sessionA.copy(accessToken = "access-2"), store.current())
    }

    @Test fun `clearIf de otra sesion no borra la guardada`() = runTest {
        store.save(sessionB)
        store.clearIf("session-A")
        assertEquals(sessionB, store.current())
    }

    @Test fun `clearIf de la misma sesion la borra`() = runTest {
        store.save(sessionA)
        store.clearIf("session-A")
        assertNull(store.current())
    }

    // Codex P2: un error de lectura no termina la observación; un login posterior se ve.
    @Test fun `error de lectura emite sin sesion y sigue observando`() = runTest {
        dataStore.readFailures = 1
        val seen = mutableListOf<AuthState?>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { store.state.toList(seen) }

        assertEquals(listOf<AuthState?>(null), seen)

        advanceTimeBy(DataStoreTokenStore.READ_RETRY_DELAY_MS + 1)
        store.save(sessionA)
        runCurrent()

        assertEquals(sessionA, seen.last())
    }

    @Test fun `current con error de lectura devuelve null sin colgarse`() = runTest {
        dataStore.readFailures = 1
        assertNull(store.current())
    }

    // Codex P2 (ronda 2): read() distingue "sin sesión" de "no se pudo leer".
    @Test fun `read con error de lectura lanza IOException`() = runTest {
        store.save(sessionA)
        dataStore.readFailures = 1
        assertThrows(IOException::class.java) { runBlocking { store.read() } }
    }

    @Test fun `read devuelve la sesion visible`() = runTest {
        assertNull(store.read())
        store.save(sessionA)
        assertEquals(sessionA, store.read())
    }
}
