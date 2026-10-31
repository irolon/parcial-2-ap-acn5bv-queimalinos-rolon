package com.fittrainer.data.db.progress

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.db.FitTrainerDatabase
import com.fittrainer.data.db.workout.history.HistoryExerciseEntity
import com.fittrainer.data.db.workout.history.HistorySessionEntity
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ProgressDaoTest {
    private val db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
    private val dao = db.progressDao()

    private suspend fun session(id: String, owner: String, startedAt: Long, vararg exercises: Pair<String?, String>) {
        db.historyDao().upsertSessions(
            listOf(HistorySessionEntity(id, owner, startedAt, null, null, null, null, null, null, false, 3, 300.0, false, true, true)),
        )
        db.historyDao().insertExercises(
            exercises.mapIndexed { i, (exId, name) -> HistoryExerciseEntity(id, i, name, null, 3, 10, 40.0, false, exId) },
        )
    }

    @After fun close() = db.close()

    @Test fun agrupaPorEjercicioConElNombreDeLaSesionMasRecienteYOrdenaPorFecha() = runBlocking {
        session("s1", "u1", 100, "e1" to "Press viejo", "e3" to "Remo")
        session("s2", "u1", 300, "e1" to "Press nuevo", null to "Sin id")
        session("s3", "u1", 200, "e2" to "Sentadilla")
        session("s4", "u2", 900, "e9" to "Ajeno", "e1" to "Press ajeno")

        val result = dao.observeTrainedExercises("u1").first()

        assertEquals(
            listOf(TrainedExercise("e1", "Press nuevo", 300), TrainedExercise("e2", "Sentadilla", 200), TrainedExercise("e3", "Remo", 100)),
            result,
        )
    }

    @Test fun sinHistorialDelDuenoDevuelveVacio() = runBlocking {
        session("s1", "u2", 100, "e1" to "Press")
        assertEquals(emptyList<TrainedExercise>(), dao.observeTrainedExercises("u1").first())
    }

    @Test fun elMarcadorEsElUltimoStartedAtDelEjercicioDelDueno() = runBlocking {
        session("s1", "u1", 100, "e1" to "Press")
        session("s2", "u1", 300, "e1" to "Press", "e2" to "Remo")
        session("s3", "u2", 900, "e1" to "Press ajeno")
        assertEquals(300L, dao.lastTrainedAt("u1", "e1"))
        assertEquals(null, dao.lastTrainedAt("u1", "e9"))
    }

    @Test fun laMetaGuardaElMarcadorDelHistorial() = runBlocking {
        dao.replaceExercise(ProgressExerciseMetaEntity("u1", "e1", "e1rm_kg", null, null, null, null, 1L, historyMarker = 300L), emptyList())
        assertEquals(300L, dao.meta("u1", "e1")?.historyMarker)
    }
}
