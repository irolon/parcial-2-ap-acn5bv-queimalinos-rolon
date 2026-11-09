package com.fittrainer.data.auth.logout

import com.fittrainer.testing.fakes.auth.logout.MemoryPendingLogoutDataStore
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class PendingLogoutStoreTest {
    private val dataStore = MemoryPendingLogoutDataStore()
    private val store = PendingLogoutStore(dataStore)

    @Test fun `un refresh aparece una sola vez y gana el ultimo token de push`() = runTest {
        store.add(PendingLogout("r1", "fcm-a"))
        store.add(PendingLogout("r2"))
        store.add(PendingLogout("r1", "fcm-b"))
        assertEquals(listOf(PendingLogout("r2"), PendingLogout("r1", "fcm-b")), store.all())
    }

    @Test fun `guarda a lo sumo los diez mas nuevos`() = runTest {
        repeat(12) { store.add(PendingLogout("r$it")) }
        assertEquals((2 until 12).map { PendingLogout("r$it") }, store.all())
    }

    @Test fun `remove saca solo los que llegaron`() = runTest {
        store.add(PendingLogout("r1"))
        store.add(PendingLogout("r2"))
        store.remove(setOf("r1"))
        assertEquals(listOf(PendingLogout("r2")), store.all())
    }

    @Test fun `remove con reregister lo anota en la misma escritura`() = runTest {
        store.add(PendingLogout("r1", "fcm-1"))
        var writes = 0
        dataStore.onUpdate = { writes++ }
        store.remove(setOf("r1"), reregister = true)
        assertEquals(1, writes)
        assertEquals(PendingLogoutFile(emptyList(), reregisterMarks = 1), dataStore.value.value)
        store.confirmReregister(1)
        assertEquals(false, store.needsReregister())
    }

    @Test fun `confirmar una marca vieja no tapa una baja posterior`() = runTest {
        store.add(PendingLogout("r1", "fcm-1"))
        store.add(PendingLogout("r2", "fcm-1"))
        store.remove(setOf("r1"), reregister = true)
        val seen = store.reregisterMark()!!
        store.remove(setOf("r2"), reregister = true)
        store.confirmReregister(seen)
        assertEquals(true, store.needsReregister())
    }
}
