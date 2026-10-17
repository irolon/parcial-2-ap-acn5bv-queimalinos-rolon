package com.fittrainer.data.auth.tokenstore.datastoretokenstore

import com.fittrainer.data.auth.AuthFile
import com.fittrainer.data.auth.tokenstore.DataStoreTokenStore
import com.fittrainer.testing.fakes.auth.MutableClock
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DataStoreTokenStoreAllMarkTest : DataStoreTokenStoreTestBase() {

    // Codex P2 (ronda 4): una marca vieja que no se pudo borrar nunca oculta una sesión creada después.
    @Test fun `si save no puede vaciar las marcas la sesion nueva igual se ve al reiniciar`() = runTest {
        val clock = MutableClock(100)
        dataStore.value.value = AuthFile(sessionA.copy(createdAt = 50))
        val store = DataStoreTokenStore(dataStore, tombstones, clock = clock)
        dataStore.failBeforeRead = true
        store.clear() // no se supo qué sesión había: marca "todas" a las 100
        dataStore.failBeforeRead = false
        tombstones.failReset = true
        clock.millis = 200
        val nueva = sessionB.copy(createdAt = 200)

        store.save(nueva)

        val restarted = DataStoreTokenStore(dataStore, tombstones, clock = clock)
        assertEquals(nueva, store.current())
        assertEquals(nueva, restarted.current())
        assertEquals(nueva, restarted.state.first())
        assertEquals(setOf("*@100"), tombstones.closed())
    }

    @Test fun `la marca de todas oculta al reiniciar las sesiones creadas hasta ese momento`() = runTest {
        dataStore.value.value = AuthFile(sessionA.copy(createdAt = 100))
        val store = DataStoreTokenStore(dataStore, tombstones, clock = MutableClock(100))
        dataStore.failBeforeRead = true
        store.clear()
        dataStore.failBeforeRead = false

        assertNull(store.current())
        assertNull(DataStoreTokenStore(dataStore, tombstones, clock = MutableClock(300)).current())
    }

    @Test fun `la marca de una sesion vieja no oculta una sesion nueva`() = runTest {
        store.save(sessionA)
        dataStore.failWrites = true
        store.clearIf("session-A")
        dataStore.failWrites = false
        tombstones.failReset = true

        store.save(sessionB)

        assertEquals(sessionB, store.current())
        assertEquals(sessionB, restarted().current())
        assertEquals(setOf("session-A"), tombstones.closed())
    }

    @Test fun `una marca legada sin hora oculta la sesion vieja pero no una guardada despues`() = runTest {
        // Sesión y marca de una versión anterior: sin createdAt (lee 0) y "*" sin hora.
        dataStore.value.value = AuthFile(sessionA.copy(createdAt = 0))
        tombstones.close("*")
        val clock = MutableClock(500)
        val store = DataStoreTokenStore(dataStore, tombstones, clock = clock)
        assertNull(store.current())
        assertNull(DataStoreTokenStore(dataStore, tombstones, clock = clock).current())

        tombstones.failReset = true
        clock.millis = 600
        val nueva = sessionB.copy(createdAt = 600)
        store.save(nueva)

        assertEquals(nueva, store.current())
        assertEquals(nueva, DataStoreTokenStore(dataStore, tombstones, clock = MutableClock(700)).current())
    }
}
