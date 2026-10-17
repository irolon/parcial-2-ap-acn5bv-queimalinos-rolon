package com.fittrainer.data.auth.tokenstore.datastoretokenstore

import com.fittrainer.data.auth.tokenstore.DataStoreTokenStore
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class DataStoreTokenStoreConcurrencyTest : DataStoreTokenStoreTestBase() {

    // Codex P2 (ronda 3): un save en curso no puede deshacer el cierre persistente de un logout.
    // El mutex del store ordena las mutaciones enteras: el save (que tomó el lock primero) termina,
    // marcas incluidas, y recién después corre el clear; su marca queda y oculta la sesión al reiniciar.
    @Test fun `un save en curso no deshace la marca de un clear fallido concurrente`() = runTest {
        val store = DataStoreTokenStore(dataStore, tombstones, StandardTestDispatcher(testScheduler))
        val gate = CompletableDeferred<Unit>()
        dataStore.afterWriteGate = gate

        val saving = launch { store.save(sessionA) }
        runCurrent() // el archivo ya tiene la sesión A; el save quedó frenado antes de vaciar las marcas
        dataStore.failWrites = true
        val clearing = async { runCatching { store.clear() } }
        runCurrent()
        gate.complete(Unit)
        saving.join()
        val cleared = clearing.await()
        dataStore.failWrites = false

        assertNull(restarted().current())
        assertEquals(setOf("session-A"), tombstones.closed())
        assertTrue(cleared.isSuccess)
        assertNull(store.current())
    }
}
