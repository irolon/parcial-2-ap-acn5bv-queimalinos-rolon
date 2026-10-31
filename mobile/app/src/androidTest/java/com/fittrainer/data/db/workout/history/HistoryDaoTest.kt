package com.fittrainer.data.db.workout.history

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
class HistoryDaoTest {
    private val db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
    private val dao = db.historyDao()

    private fun session(id: String, owner: String = "u1", startedAt: Long = 1L, inLatest: Boolean = true) =
        HistorySessionEntity(id, owner, startedAt, startedAt + 60_000, 1, "Push", null, null, null, false, 3, 300.0, false, inLatest, false)

    private fun exercise(sessionId: String) = HistoryExerciseEntity(sessionId, 0, "Press", null, 3, 10, 40.0, false)
    private fun set(id: String, sessionId: String) = HistorySetEntity(id, sessionId, 0, 1, 10, 40.0, 1L)

    @After fun close() = db.close()

    @Test fun ordenaDeLaMasNuevaALaMasViejaYSoloDelDueno() = runBlocking {
        dao.upsertSessions(listOf(session("a", startedAt = 1), session("b", startedAt = 2), session("c", owner = "u2")))
        assertEquals(listOf("b", "a"), dao.observeSessions("u1").first().map { it.id })
    }

    @Test fun replaceLatestConservaElDetalle() = runBlocking {
        dao.upsertSessions(listOf(session("a")))
        dao.replaceDetail("a", listOf(exercise("a")), listOf(set("s1", "a")))
        dao.replaceLatest("u1", listOf(session("a")), complete = true)
        assertEquals(1, dao.observeDetail("u1", "a").first()!!.sets.size)
    }

    @Test fun replaceLatestNoBorraLasDeVerMasMasViejasQueLaVentana() = runBlocking {
        dao.upsertSessions(listOf(session("b", startedAt = 20), session("a", startedAt = 10), session("viejo", startedAt = 5, inLatest = false)))
        dao.replaceDetail("viejo", listOf(exercise("viejo")), listOf(set("s1", "viejo")))
        dao.replaceLatest("u1", listOf(session("c", startedAt = 30), session("b", startedAt = 20)), complete = false)
        assertEquals(listOf("c", "b", "a", "viejo"), dao.observeSessions("u1").first().map { it.id })
        assertEquals(1, dao.observeDetail("u1", "viejo").first()!!.sets.size)
        assertEquals(setOf("c", "b"), dao.sessions("u1").filter { it.inLatest }.map { it.id }.toSet())
    }

    @Test fun replaceLatestBorraLaQueEstabaDentroDeLaVentanaYNoVino() = runBlocking {
        dao.upsertSessions(listOf(session("b", startedAt = 20), session("borrada", startedAt = 15), session("a", startedAt = 10), session("viejo", startedAt = 5)))
        dao.replaceLatest("u1", listOf(session("b", startedAt = 20), session("a", startedAt = 10)), complete = false)
        assertEquals(listOf("b", "a", "viejo"), dao.observeSessions("u1").first().map { it.id })
    }

    @Test fun replaceLatestDesempataPorIdEnElBordeDeLaVentana() = runBlocking {
        // Orden startedAt DESC, id DESC: con el mismo inicio, "m" va antes que "k" (dentro) y "e" después (fuera).
        dao.upsertSessions(listOf(session("m", startedAt = 10), session("k", startedAt = 10), session("e", startedAt = 10)))
        dao.replaceLatest("u1", listOf(session("k", startedAt = 10)), complete = false)
        assertEquals(listOf("k", "e"), dao.observeSessions("u1").first().map { it.id })
    }

    @Test fun replaceLatestCompletaOVaciaBorraTodasLasQueNoVinieron() = runBlocking {
        dao.upsertSessions(listOf(session("a", startedAt = 10), session("viejo", startedAt = 5)))
        dao.replaceLatest("u1", listOf(session("a", startedAt = 10)), complete = true)
        assertEquals(listOf("a"), dao.sessions("u1").map { it.id })
        dao.replaceLatest("u1", emptyList(), complete = false)
        assertTrue(dao.sessions("u1").isEmpty())
    }

    @Test fun replaceLatestSinNingunaConocidaBorraTodasPorqueNoSabeSiHayHueco() = runBlocking {
        dao.upsertSessions(listOf(session("a", startedAt = 10), session("viejo", startedAt = 5)))
        dao.replaceLatest("u1", listOf(session("n", startedAt = 30)), complete = false)
        assertEquals(listOf("n"), dao.sessions("u1").map { it.id })
    }

    @Test fun replaceDetailDeUnaSesionQueYaNoEstaNoHaceNada() = runBlocking {
        assertFalse(dao.replaceDetail("fantasma", listOf(exercise("fantasma")), listOf(set("s1", "fantasma"))))
        db.query("SELECT COUNT(*) FROM history_sets", null).use { it.moveToFirst(); assertEquals(0, it.getInt(0)) }
    }

    @Test fun replaceLatestNoTocaAOtroDueno() = runBlocking {
        dao.upsertSessions(listOf(session("x", owner = "u2")))
        dao.replaceLatest("u1", listOf(session("a")), complete = true)
        assertEquals(listOf("x"), dao.sessions("u2").map { it.id })
    }

    @Test fun borrarLaSesionBorraEnCascada() = runBlocking {
        dao.upsertSessions(listOf(session("a")))
        dao.replaceDetail("a", listOf(exercise("a")), listOf(set("s1", "a")))
        dao.clear("u1")
        assertTrue(dao.observeDetail("u1", "a").first() == null)
        db.query("SELECT COUNT(*) FROM history_sets", null).use { it.moveToFirst(); assertEquals(0, it.getInt(0)) }
    }

    @Test fun insertIfAbsentNoPisaUnaDeLasVeinte() = runBlocking {
        dao.upsertSessions(listOf(session("a")))
        dao.replaceDetail("a", listOf(exercise("a")), listOf(set("s1", "a")))
        dao.insertIfAbsent(listOf(session("a", inLatest = false)))
        val a = dao.sessions("u1").single()
        assertTrue(a.inLatest && a.detailLoaded)
    }

    private fun commented(id: String, owner: String = "u1", comment: String? = "Bien") = session(id, owner).copy(trainerComment = comment)

    @Test fun sinLeerCuentaSoloConComentarioNoVacioYDelDueno() = runBlocking {
        dao.upsertSessions(listOf(commented("a"), commented("b", comment = null), commented("c", comment = "  "), commented("d", owner = "u2")))
        assertEquals(1, dao.observeUnreadCount("u1").first())
    }

    @Test fun marcarLeidoBajaElConteoPeroSoloParaEseDuenoYEseTexto() = runBlocking {
        dao.upsertSessions(listOf(commented("a"), commented("x", owner = "u2")))
        dao.markSeen(HistoryCommentSeenEntity("a", "u2", "Bien"))
        assertEquals(1, dao.observeUnreadCount("u1").first())
        dao.markSeen(HistoryCommentSeenEntity("a", "u1", "Bien"))
        assertEquals(0, dao.observeUnreadCount("u1").first())
        dao.upsertSessions(listOf(commented("a", comment = "Bien, subí el peso")))
        assertEquals(1, dao.observeUnreadCount("u1").first())
        assertEquals(1, dao.observeUnreadCount("u2").first())
    }

    @Test fun clearBorraTambienLosLeidosDelDueno() = runBlocking {
        dao.upsertSessions(listOf(commented("a"), commented("x", owner = "u2")))
        dao.markSeen(HistoryCommentSeenEntity("a", "u1", "Bien"))
        dao.markSeen(HistoryCommentSeenEntity("x", "u2", "Bien"))
        dao.clear("u1")
        assertEquals(listOf("x"), dao.observeSeen("u2").first().map { it.sessionId })
        assertTrue(dao.observeSeen("u1").first().isEmpty())
        dao.clearAll()
        assertTrue(dao.observeSeen("u2").first().isEmpty())
    }
}
