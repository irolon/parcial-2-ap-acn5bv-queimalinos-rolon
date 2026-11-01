package com.fittrainer.data.db.notifications

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.db.FitTrainerDatabase
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NotificationDaoTest {
    private val db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
    private val dao = db.notificationDao()

    private fun row(id: String, createdAt: Long, owner: String = "u1", read: Boolean = false) =
        NotificationEntity(id, owner, "comment", "Título $id", null, "{}", read, createdAt)

    private suspend fun single() = dao.observe("u1").first().single()

    @After fun close() = db.close()

    @Test fun ordenaPorFechaDescYDesempataPorId() = runBlocking {
        dao.upsertKeepingRead("u1", listOf(row("a", 100), row("c", 200), row("b", 200)))
        assertEquals(listOf("c", "b", "a"), dao.observe("u1").first().map { it.id })
    }

    @Test fun upsertGuardaLeidaLaQueTieneLecturaPendiente() = runBlocking {
        dao.markRead("u1", "n1") // todavía no está guardada

        dao.upsertKeepingRead("u1", listOf(row("n1", 100, read = false)))

        assertTrue(single().read)
        assertEquals(listOf("n1"), dao.pendingReads("u1"))
    }

    @Test fun refrescoNoVuelveANoLeidoUnaFilaLeida() = runBlocking {
        dao.upsertAll(listOf(row("n1", 100, read = true)))

        dao.upsertKeepingRead("u1", listOf(row("n1", 100, read = false)))

        assertTrue(single().read)
        assertEquals(emptyList<String>(), dao.pendingReads("u1"))
    }

    @Test fun upsertActualizaLasFilasSinPendiente() = runBlocking {
        dao.upsertAll(listOf(row("n1", 100)))
        dao.upsertKeepingRead("u1", listOf(row("n1", 100, read = true)))
        assertTrue(single().read)
    }

    @Test fun replaceFirstPageBorraSoloDentroDeLaVentana() = runBlocking {
        dao.upsertAll(listOf(row("viejaPaginada", 50), row("dentroQueSigue", 150), row("dentroQueSeFue", 160), row("masNueva", 300)))

        // La primera página trae desde 400 hasta 150: lo que está en [150, ∞) y no vino se borra.
        dao.replaceFirstPage("u1", listOf(row("nueva", 400), row("dentroQueSigue", 150)))

        assertEquals(listOf("nueva", "dentroQueSigue", "viejaPaginada"), dao.observe("u1").first().map { it.id })
    }

    @Test fun replaceFirstPageNoTocaALosOtrosDuenos() = runBlocking {
        dao.upsertAll(listOf(row("ajena", 200, owner = "u2")))
        dao.replaceFirstPage("u1", listOf(row("propia", 100)))
        assertEquals(listOf("ajena"), dao.observe("u2").first().map { it.id })
    }

    @Test fun replaceFirstPageVaciaBorraLasFilasPeroNoLasPendientes() = runBlocking {
        dao.upsertAll(listOf(row("vieja", 1), row("pendiente", 2), row("ajena", 3, owner = "u2")))
        dao.markRead("u1", "pendiente")

        dao.replaceFirstPage("u1", emptyList())

        assertEquals(emptyList<NotificationEntity>(), dao.observe("u1").first())
        assertEquals(listOf("pendiente"), dao.pendingReads("u1"))
        assertEquals(1, dao.observe("u2").first().size)
    }

    @Test fun markReadDeOtroDuenoNoTocaLaFilaAjena() = runBlocking {
        dao.upsertAll(listOf(row("a", 1)))

        dao.markRead("u2", "a")

        assertEquals(emptyList<String>(), dao.pendingReads("u1"))
        assertFalse(single().read)
    }

    @Test fun unreadCountPorDueno() = runBlocking {
        dao.upsertAll(listOf(row("a", 1), row("b", 2, read = true), row("c", 3, owner = "u2")))
        assertEquals(1, dao.observeUnreadCount("u1").first())
        assertEquals(1, dao.observeUnreadCount("u2").first())
    }

    @Test fun markReadDejaPendienteYClearPendingLoLimpia() = runBlocking {
        dao.upsertAll(listOf(row("a", 1), row("b", 2)))

        dao.markRead("u1", "a")
        dao.markRead("u1", "a") // repetida: una sola pendiente
        assertEquals(listOf("a"), dao.pendingReads("u1"))
        assertEquals(1, dao.observeUnreadCount("u1").first())

        dao.clearPending("u1", listOf("a"))
        assertEquals(emptyList<String>(), dao.pendingReads("u1"))
        assertTrue(dao.observe("u1").first().first { it.id == "a" }.read)
    }

    @Test fun markAllReadDejaPendientesSoloDelDueno() = runBlocking {
        dao.upsertAll(listOf(row("a", 1), row("b", 2, read = true), row("c", 3, owner = "u2")))

        dao.markAllRead("u1")

        assertEquals(listOf("a"), dao.pendingReads("u1"))
        assertEquals(0, dao.observeUnreadCount("u1").first())
        assertEquals(1, dao.observeUnreadCount("u2").first())
    }

    @Test fun setReadExceptMarcaLasQueNoEstanEnLaLista() = runBlocking {
        dao.upsertAll(listOf(row("a", 1), row("b", 2), row("c", 3, owner = "u2")))

        dao.setReadExcept("u1", listOf("b"))

        assertEquals(1, dao.observeUnreadCount("u1").first())
        assertFalse(dao.observe("u1").first().first { it.id == "b" }.read)
        assertEquals(1, dao.observeUnreadCount("u2").first())
    }

    @Test fun clearOwnerBorraFilasPendientesYMetaSoloDelDueno() = runBlocking {
        dao.upsertAll(listOf(row("a", 1), row("c", 3, owner = "u2")))
        dao.markRead("u1", "a")
        dao.markRead("u2", "c")
        dao.updateMeta("u1") { it.copy(everLoaded = true) }

        dao.clearOwner("u1")
        assertEquals(emptyList<NotificationEntity>(), dao.observe("u1").first())
        assertEquals(emptyList<String>(), dao.pendingReads("u1"))
        assertEquals(null, dao.meta("u1"))
        assertEquals(listOf("c"), dao.pendingReads("u2"))

        dao.clearOwner(null)
        assertEquals(emptyList<NotificationEntity>(), dao.observe("u2").first())
        assertEquals(emptyList<String>(), dao.pendingReads("u2"))
    }
}
