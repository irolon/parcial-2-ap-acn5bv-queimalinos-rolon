package com.fittrainer.data.auth.tokenstore.datastoretokenstore

import com.fittrainer.data.auth.AuthFile
import com.fittrainer.data.auth.tokenstore.DataStoreTokenStore
import com.fittrainer.testing.fakes.auth.MutableClock
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DataStoreTokenStoreClockSkewTest : DataStoreTokenStoreTestBase() {

    // Codex (ronda 5, caso A): un login que corre contra un logout fallido, o con el reloj atrasado,
    // queda con createdAt <= una marca de "todas"; save lo corre después de la marca.
    @Test fun `save con createdAt anterior a una marca de todas igual queda visible al reiniciar`() = runTest {
        tombstones.close("*@500")
        tombstones.failReset = true
        val store = DataStoreTokenStore(dataStore, tombstones, clock = MutableClock(300))
        val nueva = sessionB.copy(createdAt = 300)

        store.save(nueva)

        val esperada = nueva.copy(createdAt = 501)
        assertEquals(esperada, dataStore.value.value.auth)
        assertEquals(esperada, store.current())
        assertEquals(esperada, DataStoreTokenStore(dataStore, tombstones, clock = MutableClock(300)).current())
    }

    // Codex (ronda 5, caso B): si el reloj atrasa entre el login y un clear que falla antes de leer,
    // la marca no puede quedar anterior a la sesión ya vista.
    @Test fun `con el reloj atrasado la marca de todas igual oculta la sesion vista al reiniciar`() = runTest {
        val clock = MutableClock(1_000)
        dataStore.value.value = AuthFile(sessionA.copy(createdAt = 1_000))
        val store = DataStoreTokenStore(dataStore, tombstones, clock = clock)
        assertEquals(sessionA.copy(createdAt = 1_000), store.current())
        clock.millis = 400
        dataStore.failBeforeRead = true

        store.clear()

        dataStore.failBeforeRead = false
        assertNull(store.current())
        assertNull(DataStoreTokenStore(dataStore, tombstones, clock = clock).current())
        val mark = tombstones.closed().single()
        assertTrue(mark.substringAfter('@').toLong() >= 1_000)
    }

    // Una marca corrupta con la hora máxima no desborda createdAt + 1 ni oculta la sesión nueva.
    @Test fun `una marca de todas con hora maxima no oculta la sesion nueva`() = runTest {
        tombstones.close("*@${Long.MAX_VALUE}")
        tombstones.failReset = true
        val store = DataStoreTokenStore(dataStore, tombstones, clock = MutableClock(300))
        val nueva = sessionB.copy(createdAt = 300)

        store.save(nueva)

        assertEquals(nueva, store.current())
        assertEquals(nueva, DataStoreTokenStore(dataStore, tombstones, clock = MutableClock(300)).current())
    }

    // Caso B por el camino de save(): la sesión guardada en este proceso también es piso de la marca.
    @Test fun `con el reloj atrasado tras un save la marca de todas oculta esa sesion`() = runTest {
        val clock = MutableClock(1_000)
        val store = DataStoreTokenStore(dataStore, tombstones, clock = clock)
        store.save(sessionA.copy(createdAt = 1_000))
        clock.millis = 400
        dataStore.failBeforeRead = true

        store.clear()

        dataStore.failBeforeRead = false
        assertNull(store.current())
        assertNull(DataStoreTokenStore(dataStore, tombstones, clock = clock).current())
    }

    @Test fun `si vaciar las marcas lanza save no falla`() = runTest {
        tombstones.resetError = IllegalStateException("prefs rotas")

        store.save(sessionA)

        assertEquals(sessionA, store.current())
    }
}
