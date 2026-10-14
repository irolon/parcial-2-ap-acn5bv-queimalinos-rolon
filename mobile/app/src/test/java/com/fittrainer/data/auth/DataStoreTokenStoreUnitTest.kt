package com.fittrainer.data.auth

import com.fittrainer.data.FakeDataStore
import com.fittrainer.data.FakeSessionTombstones
import com.fittrainer.data.MutableClock
import com.fittrainer.data.authState
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
/** Tests JVM de [DataStoreTokenStore] (el de androidTest cubre el cifrado real). */
class DataStoreTokenStoreUnitTest {

    private val sessionA = authState(session = "session-A")
    private val sessionB = authState(access = "access-B", refresh = "refresh-B", session = "session-B")
    private val dataStore = FakeDataStore()
    private val tombstones = FakeSessionTombstones()
    private val store = DataStoreTokenStore(dataStore, tombstones)

    /** Otro store sobre el mismo disco: simula un reinicio del proceso. */
    private fun restarted() = DataStoreTokenStore(dataStore, tombstones)

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
