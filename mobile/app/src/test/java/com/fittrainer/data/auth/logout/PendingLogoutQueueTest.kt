package com.fittrainer.data.auth.logout

import com.fittrainer.testing.fakes.auth.logout.MemoryPendingLogoutDataStore
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Codex ronda 2, hallazgo 1: la pasada se programa esperando a WorkManager y se retoma al abrir la app. */
class PendingLogoutQueueTest {

    private class FakeScheduler : LogoutRetryScheduler {
        var calls = 0
        var error: Exception? = null
        override suspend fun schedule() {
            calls++
            error?.let { throw it }
        }
    }

    private class SilentLogger : LogoutRetryLogger() {
        val errors = mutableListOf<String>()
        override fun failed(what: String, error: Exception) {
            errors += what
        }
    }

    private val dataStore = MemoryPendingLogoutDataStore()
    private val store = PendingLogoutStore(dataStore)
    private val scheduler = FakeScheduler()
    private val logger = SilentLogger()
    private val queue = PendingLogoutQueue(store, scheduler, logger)

    @Test fun `hold guarda el pendiente y programa la pasada`() = runTest {
        queue.hold(PendingLogout("r1", "fcm-1"))
        assertEquals(listOf(PendingLogout("r1", "fcm-1")), store.all())
        assertEquals(1, scheduler.calls)
    }

    @Test fun `si WorkManager no la pudo programar no lanza y el pendiente queda para el arranque`() = runTest {
        scheduler.error = IllegalStateException("no se pudo encolar")
        queue.hold(PendingLogout("r1"))
        assertEquals(listOf(PendingLogout("r1")), store.all())
        assertEquals(1, logger.errors.size)

        scheduler.error = null
        queue.resume()
        assertEquals(2, scheduler.calls)
    }

    @Test fun `al abrir la app sin nada pendiente no programa nada`() = runTest {
        queue.resume()
        assertEquals(0, scheduler.calls)
    }

    @Test fun `al abrir la app con un alta de push por restaurar programa la pasada`() = runTest {
        dataStore.value.value = PendingLogoutFile(reregisterMarks = 1)
        queue.resume()
        assertEquals(1, scheduler.calls)
    }

    @Test fun `release saca el pendiente`() = runTest {
        queue.hold(PendingLogout("r1"))
        queue.release("r1", pushTokenRemoved = false)
        assertTrue(store.all().isEmpty())
        assertFalse(store.needsReregister())
        assertEquals(1, scheduler.calls)
    }

    // Codex ronda 3: logout directo demorado que borra el token después de un login nuevo.
    @Test fun `release que borro un token anota el alta y programa la pasada que la confirma`() = runTest {
        queue.hold(PendingLogout("r1", "fcm-1"))
        queue.release("r1", pushTokenRemoved = true)
        assertTrue(store.all().isEmpty())
        assertTrue(store.needsReregister())
        assertEquals(2, scheduler.calls)
    }

    @Test fun `si el disco falla al guardar no lanza`() = runTest {
        dataStore.onUpdate = { throw IOException("disco lleno") }
        queue.hold(PendingLogout("r1"))
        assertEquals(1, logger.errors.size)
    }
}
