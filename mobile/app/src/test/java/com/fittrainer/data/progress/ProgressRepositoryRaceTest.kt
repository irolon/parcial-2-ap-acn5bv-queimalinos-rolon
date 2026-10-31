package com.fittrainer.data.progress

import com.fittrainer.data.api.progress.BodyPointDto
import com.fittrainer.data.api.progress.BodyProgressDto
import com.fittrainer.data.api.progress.ExercisePointDto
import com.fittrainer.data.api.progress.ExerciseProgressDto
import com.fittrainer.data.api.progress.ExerciseRefDto
import com.fittrainer.data.db.progress.ProgressBodyPointEntity
import com.fittrainer.data.db.progress.ProgressExerciseMetaEntity
import com.fittrainer.data.db.progress.ProgressExercisePointEntity
import com.fittrainer.data.db.progress.TrainedExercise
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.progress.FakeProgressApi
import com.fittrainer.testing.fakes.progress.FakeProgressDao
import com.fittrainer.testing.fakes.progress.httpErrorWithCode
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.yield
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Un DAO que, justo antes de escribir, deja correr un logout (como si llegara entre el chequeo y la escritura). */
private class RacingDao : FakeProgressDao() {
    var beforeWrite: (suspend () -> Unit)? = null

    override suspend fun replaceExercise(meta: ProgressExerciseMetaEntity, points: List<ProgressExercisePointEntity>) {
        beforeWrite?.invoke()
        super.replaceExercise(meta, points)
    }

    override suspend fun replaceBody(ownerId: String, points: List<ProgressBodyPointEntity>, fetchedAt: Long) {
        beforeWrite?.invoke()
        super.replaceBody(ownerId, points, fetchedAt)
    }
}

@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class ProgressRepositoryRaceTest {
    private val api = FakeProgressApi()
    private val dao = RacingDao()
    private val repository = ProgressRepository(api, dao, { FakeStudentSession() }, MutableClock(1_000_000L))

    private fun dto() = ExerciseProgressDto(
        ExerciseRefDto("ex1", "Sentadilla"),
        listOf(ExercisePointDto("2026-10-01", maxKg = 80.0, e1rmKg = 90.0, sets = 3, reps = 8)),
        defaultMetric = "e1rm_kg",
    )

    private fun cacheIsEmpty() = dao.state.value.let {
        it.points.isEmpty() && it.metas.isEmpty() && it.body.isEmpty() && it.bodyMetas.isEmpty()
    }

    @Test fun unLogoutEntreElChequeoYLaEscrituraDeEjercicioNoDejaFilas() = runTest {
        api.exercises = mapOf("ex1" to dto())
        val scope = CoroutineScope(coroutineContext)
        dao.beforeWrite = { scope.launch { repository.clearUserData("u1") }; yield() }
        repository.refreshExercise("u1", "ex1")
        advanceUntilIdle()
        assertTrue(cacheIsEmpty())
    }

    @Test fun unLogoutEntreElChequeoYLaEscrituraDeMedidasNoDejaFilas() = runTest {
        api.body = BodyProgressDto(listOf(BodyPointDto("b1", "2026-10-01T10:00:00Z", weightKg = 70.0)))
        val scope = CoroutineScope(coroutineContext)
        dao.beforeWrite = { scope.launch { repository.clearUserData("u1") }; yield() }
        repository.refreshBody("u1")
        advanceUntilIdle()
        assertTrue(cacheIsEmpty())
    }

    @Test fun unNotFoundDeUnDuenoNoEscondeElEjercicioDeOtro() = runTest {
        dao.trained.value = mapOf("u1" to listOf(TrainedExercise("ex1", "S", 1L)), "u2" to listOf(TrainedExercise("ex1", "S", 1L)))
        api.error = httpErrorWithCode(404, "EXERCISE_NOT_FOUND")
        repository.refreshExercise("u1", "ex1")
        assertTrue(repository.observeTrainedExercises("u1").first().isEmpty())
        assertEquals(1, repository.observeTrainedExercises("u2").first().size)
    }

    @Test fun clearUserDataReseteaLosNotFound() = runTest {
        dao.trained.value = mapOf("u1" to listOf(TrainedExercise("ex1", "S", 1L)))
        api.error = httpErrorWithCode(404, "EXERCISE_NOT_FOUND")
        repository.refreshExercise("u1", "ex1")
        repository.clearUserData("u1")
        assertEquals(1, repository.observeTrainedExercises("u1").first().size)
    }

    @Test fun unNotFoundQueLlegaTrasElLogoutNoSeAnota() = runTest {
        dao.trained.value = mapOf("u1" to listOf(TrainedExercise("ex1", "S", 1L)))
        api.error = httpErrorWithCode(404, "EXERCISE_NOT_FOUND")
        val gate = CompletableDeferred<Unit>()
        api.gate = gate
        val result = async { repository.refreshExercise("u1", "ex1") }
        runCurrent()
        repository.clearUserData("u1")
        gate.complete(Unit)
        assertTrue(result.await().isFailure)
        assertEquals(1, repository.observeTrainedExercises("u1").first().size)
    }

    @Test fun otro404SinElCodigoNoTocaElCacheNiLaLista() = runTest {
        api.exercises = mapOf("ex1" to dto())
        dao.trained.value = mapOf("u1" to listOf(TrainedExercise("ex1", "S", 1L)))
        repository.refreshExercise("u1", "ex1")
        api.error = httpErrorWithCode(404, "ROUTE_NOT_FOUND")
        assertTrue(repository.refreshExercise("u1", "ex1", force = true).isFailure)
        assertEquals(1, repository.observeExercise("u1", "ex1").first().points.size)
        assertEquals(1, repository.observeTrainedExercises("u1").first().size)
    }
}
