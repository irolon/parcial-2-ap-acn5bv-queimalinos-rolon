package com.fittrainer.data.auth.tokenstore.datastoretokenstore

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DataStoreTokenStoreFailedClearTest : DataStoreTokenStoreTestBase() {

    // Codex P2 (ronda 3): si DataStore falla pero la marca se guarda, el cierre es persistente: no lanza.
    @Test fun `clear que falla al escribir con la marca guardada no lanza y la sesion queda cerrada`() = runTest {
        store.save(sessionA)
        dataStore.failWrites = true

        store.clear()

        assertNull(store.current())
        assertNull(store.state.first())
        dataStore.failWrites = false
        assertNull(restarted().current())
    }

    @Test fun `clearIf que falla al escribir con la marca guardada no lanza y la sesion queda cerrada`() = runTest {
        store.save(sessionA)
        dataStore.failWrites = true

        store.clearIf("session-A")

        assertNull(store.current())
        assertNull(store.state.first())
        dataStore.failWrites = false
        assertNull(restarted().current())
    }

    @Test fun `tras un clear fallido un save exitoso vuelve a mostrar la sesion nueva`() = runTest {
        store.save(sessionA)
        dataStore.failWrites = true
        runCatching { store.clear() }
        dataStore.failWrites = false

        store.save(sessionB)

        assertEquals(sessionB, store.current())
        assertEquals(sessionB, store.state.first())
    }

    @Test fun `un save fallido no deshace el cierre en memoria`() = runTest {
        store.save(sessionA)
        dataStore.failWrites = true
        runCatching { store.clear() }
        runCatching { store.save(sessionB) }

        assertNull(store.current())
    }

    // Codex P2 (ronda 2): el cierre fallido no puede deshacerse al reiniciar la app.
    @Test fun `tras un clear fallido la sesion vieja no reaparece al reiniciar`() = runTest {
        store.save(sessionA)
        dataStore.failWrites = true
        runCatching { store.clear() }
        dataStore.failWrites = false

        val store = restarted()

        assertNull(store.current())
        assertNull(store.read())
        assertNull(store.state.first())
    }

    @Test fun `tras un clearIf fallido la sesion vieja no reaparece al reiniciar`() = runTest {
        store.save(sessionA)
        dataStore.failWrites = true
        runCatching { store.clearIf("session-A") }
        dataStore.failWrites = false

        assertNull(restarted().current())
    }

    @Test fun `tras reiniciar un save exitoso muestra la sesion nueva y vacia las marcas`() = runTest {
        store.save(sessionA)
        dataStore.failWrites = true
        runCatching { store.clear() }
        dataStore.failWrites = false

        restarted().save(sessionB)

        assertEquals(sessionB, restarted().current())
        assertTrue(tombstones.closed().isEmpty())
    }

    @Test fun `un clear exitoso vacia las marcas`() = runTest {
        tombstones.close("session-viejo")
        store.save(sessionA)
        dataStore.failWrites = true
        runCatching { store.clear() }
        dataStore.failWrites = false

        store.clear()

        assertTrue(tombstones.closed().isEmpty())
    }
}
