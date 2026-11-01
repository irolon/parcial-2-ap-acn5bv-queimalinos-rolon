package com.fittrainer.data.db.progress

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.db.FitTrainerDatabase
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ProgressDaoTest {
    private val db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
    private val dao = db.progressDao()

    private fun row(owner: String, id: String, name: String, days: Int, last: String) = ProgressExerciseEntity(owner, id, name, days, last)

    private fun meta(owner: String, id: String) = ProgressExerciseMetaEntity(owner, id, "e1rm_kg", null, null, null, null, 1L)

    @After fun close() = db.close()

    @Test fun laListaVaPorDuenoConElUltimoEntrenadoPrimeroYDespuesPorNombre() = runBlocking {
        dao.replaceExercises(
            "u1",
            listOf(row("u1", "e1", "Remo", 2, "2026-09-01"), row("u1", "e2", "Sentadilla", 9, "2026-10-30"), row("u1", "e3", "Press", 1, "2026-10-30")),
            5L,
        )
        dao.replaceExercises("u2", listOf(row("u2", "e9", "Ajeno", 1, "2026-11-01")), 6L)

        assertEquals(
            listOf(
                TrainedExercise("e3", "Press", 1, "2026-10-30"),
                TrainedExercise("e2", "Sentadilla", 9, "2026-10-30"),
                TrainedExercise("e1", "Remo", 2, "2026-09-01"),
            ),
            dao.observeTrainedExercises("u1").first(),
        )
        assertEquals(5L, dao.observeExercisesMeta("u1").first()?.fetchedAt)
        assertEquals(TrainedExercise("e2", "Sentadilla", 9, "2026-10-30"), dao.trainedExercise("u1", "e2"))
        assertNull(dao.trainedExercise("u1", "e9"))
    }

    @Test fun nuncaBajadaNoTieneMetaYUnaListaVaciaBajadaSi() = runBlocking {
        assertNull(dao.exercisesMeta("u1"))
        dao.replaceExercises("u1", emptyList(), 7L)
        assertTrue(dao.observeTrainedExercises("u1").first().isEmpty())
        assertEquals(7L, dao.exercisesMeta("u1")?.fetchedAt)
    }

    @Test fun reemplazarLaListaBorraLaAnteriorDelDuenoSolamente() = runBlocking {
        dao.replaceExercises("u1", listOf(row("u1", "e1", "Remo", 2, "2026-09-01")), 1L)
        dao.replaceExercises("u2", listOf(row("u2", "e1", "Remo", 2, "2026-09-01")), 1L)
        dao.replaceExercises("u1", listOf(row("u1", "e2", "Press", 1, "2026-10-01")), 2L)
        assertEquals(listOf("e2"), dao.observeTrainedExercises("u1").first().map { it.exerciseId })
        assertEquals(listOf("e1"), dao.observeTrainedExercises("u2").first().map { it.exerciseId })
        assertEquals(2L, dao.exercisesMeta("u1")?.fetchedAt)
    }

    @Test fun un404BorraElCacheDelEjercicioYLoSacaDeLaLista() = runBlocking {
        dao.replaceExercises("u1", listOf(row("u1", "e1", "Remo", 2, "2026-09-01"), row("u1", "e2", "Press", 1, "2026-10-01")), 1L)
        dao.replaceExercise(meta("u1", "e1"), listOf(ProgressExercisePointEntity("u1", "e1", "2026-09-01", 50.0, 60.0, 3, 8)))
        dao.deleteExercise("u1", "e1")
        assertEquals(listOf("e2"), dao.observeTrainedExercises("u1").first().map { it.exerciseId })
        assertNull(dao.meta("u1", "e1"))
        assertTrue(dao.observePoints("u1", "e1").first().isEmpty())
    }

    @Test fun laMetaGuardaElMarcadorDeLaLista() = runBlocking {
        dao.replaceExercise(meta("u1", "e1").copy(trainedMarker = "2026-10-30/9"), emptyList())
        assertEquals("2026-10-30/9", dao.meta("u1", "e1")?.trainedMarker)
    }

    @Test fun elLogoutBorraLaListaDelDuenoYClearAllLaDeTodos() = runBlocking {
        dao.replaceExercises("u1", listOf(row("u1", "e1", "Remo", 2, "2026-09-01")), 1L)
        dao.replaceExercises("u2", listOf(row("u2", "e1", "Remo", 2, "2026-09-01")), 1L)
        dao.clear("u1")
        assertTrue(dao.observeTrainedExercises("u1").first().isEmpty())
        assertNull(dao.exercisesMeta("u1"))
        assertEquals(1, dao.observeTrainedExercises("u2").first().size)
        dao.clearAll()
        assertTrue(dao.observeTrainedExercises("u2").first().isEmpty())
        assertNull(dao.exercisesMeta("u2"))
    }
}
