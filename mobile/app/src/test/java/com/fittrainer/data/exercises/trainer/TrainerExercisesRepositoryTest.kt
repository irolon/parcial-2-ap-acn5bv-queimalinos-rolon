package com.fittrainer.data.exercises.trainer

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesApi
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesDao
import com.fittrainer.testing.fakes.exercises.trainerExerciseDto
import java.io.IOException
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainerExercisesRepositoryTest {

    private val api = FakeTrainerExercisesApi()
    private val dao = FakeTrainerExercisesDao()
    private val repo = TrainerExercisesRepository(api, dao)

    @Test fun `refresh pide los globales y guarda el catalogo por nombre`() = runTest {
        api.exercises = listOf(trainerExerciseDto("e2", "Sentadilla"), trainerExerciseDto("e3", "curl propio", global = false))
        assertTrue(repo.refresh("t1").isSuccess)
        val list = repo.observe("t1").first()
        assertEquals(listOf("curl propio", "Sentadilla"), list.map { it.name })
        assertFalse(list.first().isGlobal)
        assertEquals(listOf(true), api.includeGlobalCalls)
    }

    @Test fun `refresh reemplaza el catalogo entero`() = runTest {
        repo.refresh("t1")
        api.exercises = listOf(trainerExerciseDto("e2", "Sentadilla"))
        repo.refresh("t1")
        assertEquals(listOf("e2"), repo.observe("t1").first().map { it.id })
    }

    @Test fun `sin red conserva el cache y devuelve Offline`() = runTest {
        repo.refresh("t1")
        api.error = IOException("sin red")
        val result = repo.refresh("t1")
        assertEquals(DataError.Offline, (result.exceptionOrNull() as DataException).error)
        assertEquals(2, repo.observe("t1").first().size)
    }
}
