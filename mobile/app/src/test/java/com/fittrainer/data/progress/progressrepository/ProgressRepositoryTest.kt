package com.fittrainer.data.progress.progressrepository

import com.fittrainer.data.api.progress.BodyPointDto
import com.fittrainer.data.api.progress.BodyProgressDto
import com.fittrainer.data.api.progress.ExercisePointDto
import com.fittrainer.data.api.progress.ExerciseProgressDto
import com.fittrainer.data.api.progress.ExerciseRefDto
import com.fittrainer.data.api.progress.PrDto
import com.fittrainer.data.api.progress.PrValueDto
import com.fittrainer.data.auth.AccountChangedException
import com.fittrainer.data.db.progress.TrainedExercise
import com.fittrainer.data.progress.ProgressRepository
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.progress.FakeProgressApi
import com.fittrainer.testing.fakes.progress.FakeProgressDao
import com.fittrainer.testing.fakes.progress.httpErrorWithCode
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.httpError
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class ProgressRepositoryTest {
    private val api = FakeProgressApi()
    private val dao = FakeProgressDao()
    private val clock = MutableClock(1_000_000L)
    private val session = FakeStudentSession()
    private val repository = ProgressRepository(api, dao, { session }, clock)

    private fun dto(id: String = "ex1", kg: Double = 80.0) = ExerciseProgressDto(
        exercise = ExerciseRefDto(id, "Sentadilla"),
        points = listOf(
            ExercisePointDto("2026-10-02", maxKg = kg + 5, e1rmKg = kg + 10, sets = 3, reps = 10),
            ExercisePointDto("2026-10-01", maxKg = kg, e1rmKg = kg + 8, sets = 3, reps = 8),
        ),
        pr = PrDto(maxKg = PrValueDto(kg + 5, "2026-10-02"), e1rmKg = PrValueDto(kg + 10, "2026-10-02")),
        defaultMetric = "e1rm_kg",
    )

    @Test fun refrescoGuardaPuntosYRecord() = runTest {
        api.exercises = mapOf("ex1" to dto())
        repository.refreshExercise("u1", "ex1").getOrThrow()
        val chart = repository.observeExercise("u1", "ex1").first()
        assertEquals(listOf("2026-10-01", "2026-10-02"), chart.points.map { it.date })
        assertEquals(85.0, chart.meta!!.prMaxKg!!, 0.0)
        assertEquals("2026-10-02", chart.meta!!.prE1rmDate)
        assertEquals(1_000_000L, chart.meta!!.fetchedAt)
    }

    @Test fun noVuelveAPedirAntesDeCincoMinutos() = runTest {
        api.exercises = mapOf("ex1" to dto())
        repository.refreshExercise("u1", "ex1")
        clock.millis += 4 * 60_000L + 59_000L
        repository.refreshExercise("u1", "ex1")
        assertEquals(1, api.exerciseCalls)
        clock.millis += 2_000L
        repository.refreshExercise("u1", "ex1")
        assertEquals(2, api.exerciseCalls)
    }

    @Test fun mismoMarcadorDeLaListaYMenosDeCincoMinutosNoPide() = runTest {
        api.exercises = mapOf("ex1" to dto())
        dao.seedTrained("u1", TrainedExercise("ex1", "Sentadilla", 3, "2026-10-02"))
        repository.refreshExercise("u1", "ex1")
        assertEquals("2026-10-02/3", dao.state.value.metas.single().trainedMarker)
        clock.millis += 60_000L
        repository.refreshExercise("u1", "ex1")
        assertEquals(1, api.exerciseCalls)
    }

    @Test fun marcadorDistintoPideAunqueSeaMenosDeCincoMinutos() = runTest {
        api.exercises = mapOf("ex1" to dto())
        dao.seedTrained("u1", TrainedExercise("ex1", "Sentadilla", 3, "2026-10-02"))
        repository.refreshExercise("u1", "ex1")
        // Lo entrenó otro día: el overview trae una fecha más nueva y un día más.
        dao.seedTrained("u1", TrainedExercise("ex1", "Sentadilla", 4, "2026-10-05"))
        clock.millis += 60_000L
        repository.refreshExercise("u1", "ex1")
        assertEquals(2, api.exerciseCalls)
        assertEquals("2026-10-05/4", dao.state.value.metas.single().trainedMarker)
        repository.refreshExercise("u1", "ex1")
        assertEquals(2, api.exerciseCalls) // con el marcador nuevo guardado, vuelve a estar fresco
    }

    @Test fun forceIgnoraLosCincoMinutos() = runTest {
        api.exercises = mapOf("ex1" to dto())
        repository.refreshExercise("u1", "ex1")
        repository.refreshExercise("u1", "ex1", force = true)
        assertEquals(2, api.exerciseCalls)
    }

    @Test fun errorDelServidorNoBorraLoGuardado() = runTest {
        api.exercises = mapOf("ex1" to dto())
        repository.refreshExercise("u1", "ex1")
        api.error = httpError(503)
        val result = repository.refreshExercise("u1", "ex1", force = true)
        assertTrue(result.exceptionOrNull() is DataException)
        val chart = repository.observeExercise("u1", "ex1").first()
        assertEquals(2, chart.points.size)
        assertNotNull(chart.meta)
    }

    @Test fun notFoundBorraYSacaElEjercicioDeLaLista() = runTest {
        api.exercises = mapOf("ex1" to dto())
        dao.seedTrained("u1", TrainedExercise("ex1", "Sentadilla", 5, "2026-10-02"), TrainedExercise("ex2", "Press", 4, "2026-10-01"))
        repository.refreshExercise("u1", "ex1")
        api.error = httpErrorWithCode(404, "EXERCISE_NOT_FOUND")
        assertTrue(repository.refreshExercise("u1", "ex1", force = true).isSuccess)
        val chart = repository.observeExercise("u1", "ex1").first()
        assertTrue(chart.points.isEmpty())
        assertNull(chart.meta)
        assertEquals(listOf("ex2"), repository.observeTrainedExercises("u1").first().items.map { it.exerciseId })
        // Sale de Room, no de la memoria: un arranque en frío (otro repositorio, misma base) tampoco lo muestra.
        val coldStart = ProgressRepository(api, dao, { session }, clock)
        assertEquals(listOf("ex2"), coldStart.observeTrainedExercises("u1").first().items.map { it.exerciseId })
    }

    @Test fun respuestaQueLlegaDespuesDelLogoutNoEscribe() = runTest {
        api.exercises = mapOf("ex1" to dto())
        api.body = BodyProgressDto(listOf(BodyPointDto("b1", "2026-10-01T10:00:00+00:00", weightKg = 70.0)))
        val gate = CompletableDeferred<Unit>()
        api.gate = gate
        val exercise = async { repository.refreshExercise("u1", "ex1") }
        val body = async { repository.refreshBody("u1") }
        runCurrent()
        repository.clearUserData("u1")
        gate.complete(Unit)
        assertTrue(exercise.await().exceptionOrNull()?.cause is AccountChangedException)
        assertTrue(body.await().exceptionOrNull()?.cause is AccountChangedException)
        assertTrue(dao.state.value.points.isEmpty() && dao.state.value.metas.isEmpty())
        assertTrue(dao.state.value.body.isEmpty() && dao.state.value.bodyMetas.isEmpty())
    }

    @Test fun medidasSeReemplazanEnteras() = runTest {
        api.body = BodyProgressDto(
            listOf(
                BodyPointDto("b2", "2026-10-02T10:00:00+00:00", weightKg = 71.0),
                BodyPointDto("b1", "2026-10-01T10:00:00.123456+00:00", weightKg = 70.0, waistCm = 80.0),
            ),
        )
        repository.refreshBody("u1")
        api.body = BodyProgressDto(listOf(BodyPointDto("b3", "2026-10-03T10:00:00Z", weightKg = 69.0)))
        repository.refreshBody("u1", force = true)
        val chart = repository.observeBody("u1").first()
        assertEquals(listOf("b3"), chart.points.map { it.id })
        assertEquals(1_000_000L, chart.fetchedAt)
    }

    @Test fun medidasNuncaBajadasTienenFetchedAtNulo() = runTest {
        assertNull(repository.observeBody("u1").first().fetchedAt)
    }

    @Test fun medidasNoVuelvenAPedirseAntesDeCincoMinutos() = runTest {
        repository.refreshBody("u1")
        repository.refreshBody("u1")
        assertEquals(1, api.bodyCalls)
    }
}
