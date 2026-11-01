package com.fittrainer.data.exercises.trainer

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesApi
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesDao
import com.fittrainer.testing.fakes.exercises.trainerExerciseDto
import com.fittrainer.testing.fakes.auth.httpError
import java.io.IOException
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
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

    @Test fun `el alta queda en el catalogo enseguida (el selector de rutinas la ve)`() = runTest {
        repo.refresh("t1")
        val body = buildJsonObject {
            put("name", JsonPrimitive("Curl E2E"))
            put("muscle_group", JsonPrimitive("biceps"))
        }
        val id = repo.create("t1", body).getOrThrow()
        val own = repo.observe("t1").first().single { it.id == id }
        assertEquals("Curl E2E", own.name)
        assertFalse(own.isGlobal)
    }

    @Test fun `editar guarda lo que devuelve el servidor`() = runTest {
        api.exercises = api.exercises + trainerExerciseDto("o1", "Curl", "biceps", global = false)
        repo.refresh("t1")
        repo.update("t1", "o1", buildJsonObject { put("name", JsonPrimitive("Curl martillo")) })
        assertEquals("Curl martillo", repo.observe("t1").first().single { it.id == "o1" }.name)
    }

    @Test fun `borrar uno en uso da 409 con el mensaje y sigue en el catalogo`() = runTest {
        api.exercises = api.exercises + trainerExerciseDto("o1", "Curl", "biceps", global = false)
        api.inUse += "o1"
        repo.refresh("t1")
        val error = repo.delete("t1", "o1").exceptionOrNull() as ExerciseInUseException
        assertEquals("El ejercicio está en una rutina o en una sesión", error.messageText)
        assertTrue(repo.observe("t1").first().any { it.id == "o1" })
    }

    @Test fun `borrar lo saca del catalogo y un 404 tambien`() = runTest {
        api.exercises = api.exercises + trainerExerciseDto("o1", "Curl", "biceps", global = false)
        repo.refresh("t1")
        assertTrue(repo.delete("t1", "o1").isSuccess)
        assertFalse(repo.observe("t1").first().any { it.id == "o1" })
        val gone = repo.delete("t1", "o1").exceptionOrNull() as DataException
        assertEquals(DataError.NotFound, gone.error)
    }

    @Test fun `un 400 trae los errores por campo`() = runTest {
        api.writeError = httpError(
            400, """{"error":{"code":"VALIDATION_ERROR","message":"x","details":[{"field":"video_url","message":"URL inválida"}]}}""",
        )
        val error = repo.create("t1", buildJsonObject {}).exceptionOrNull() as ExerciseRejectedException
        assertEquals(mapOf("video_url" to "URL inválida"), error.fields)
    }
}
