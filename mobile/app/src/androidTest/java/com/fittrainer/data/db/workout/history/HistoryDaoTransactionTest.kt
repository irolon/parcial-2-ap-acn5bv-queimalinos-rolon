package com.fittrainer.data.db.workout.history

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.db.FitTrainerDatabase
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.atomic.AtomicInteger

/** inTransaction sobre Room real: "Ver más" y refresh se serializan (tarjeta 12). */
@RunWith(AndroidJUnit4::class)
class HistoryDaoTransactionTest {
    private val db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
    private val dao = db.historyDao()

    private fun session(id: String, inLatest: Boolean = true) =
        HistorySessionEntity(id, "u1", 1L, 60_001L, 1, "Push", null, null, null, false, 3, 300.0, false, inLatest, false)

    @After fun close() = db.close()

    @Test fun siElBloqueFallaNoQuedaNadaEscrito() = runBlocking {
        runCatching { dao.inTransaction { dao.upsertSessions(listOf(session("a"))); error("falla") } }
        assertTrue(dao.sessions("u1").isEmpty())
    }

    @Test fun unRefreshQueLlegaConUnVerMasEnCursoEsperaASuTransaccion() = runBlocking {
        val generation = AtomicInteger(0)
        val captured = generation.get()
        val moreChecked = CompletableDeferred<Unit>()
        val release = CompletableDeferred<Unit>()
        val more = async(Dispatchers.IO) {
            dao.inTransaction {
                if (generation.get() == captured) {
                    moreChecked.complete(Unit)
                    release.await()
                    dao.insertIfAbsent(listOf(session("c", inLatest = false)))
                }
            }
        }
        moreChecked.await()
        val refresh = async(Dispatchers.IO) {
            dao.inTransaction { dao.replaceLatest("u1", listOf(session("a"))); generation.incrementAndGet() }
        }
        delay(200) // sin serialización el refresh terminaría acá, y "c" sobreviviría
        release.complete(Unit)
        more.await()
        refresh.await()
        assertEquals(listOf("a"), dao.sessions("u1").map { it.id })
        assertEquals(captured + 1, generation.get())
    }
}
