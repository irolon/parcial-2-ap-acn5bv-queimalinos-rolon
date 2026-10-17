package com.fittrainer.data.auth.tokenstore.datastoretokenstore

import com.fittrainer.data.auth.tokenstore.SessionNotClosedException
import java.io.IOException
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class DataStoreTokenStoreNotClosedTest : DataStoreTokenStoreTestBase() {

    // Codex P2 (ronda 3): si fallan DataStore y la marca, el cierre no es persistente y se avisa.
    @Test fun `si la marca devuelve false clear lanza SessionNotClosedException y oculta la sesion`() = runTest {
        store.save(sessionA)
        dataStore.failWrites = true
        tombstones.failWrites = true

        val e = assertThrows(SessionNotClosedException::class.java) { runBlocking { store.clear() } }

        assertTrue(e.cause is IOException)
        assertNull(store.current())
    }

    @Test fun `si la marca lanza clear lanza SessionNotClosedException y oculta la sesion`() = runTest {
        store.save(sessionA)
        dataStore.failWrites = true
        tombstones.closeError = IllegalStateException("prefs rotas")

        assertThrows(SessionNotClosedException::class.java) { runBlocking { store.clear() } }

        assertNull(store.current())
    }

    @Test fun `si la marca devuelve false clearIf lanza SessionNotClosedException`() = runTest {
        store.save(sessionA)
        dataStore.failWrites = true
        tombstones.failWrites = true

        assertThrows(SessionNotClosedException::class.java) { runBlocking { store.clearIf("session-A") } }

        assertNull(store.current())
    }
}
