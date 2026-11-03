package com.fittrainer.data.exercises.trainer

import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesApi
import com.fittrainer.testing.fakes.exercises.FakeTrainerExercisesDao
import com.fittrainer.testing.fakes.exercises.trainerExerciseDto
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Ronda 1 de Codex: un GET que salió antes de una escritura no pisa su resultado en Room. */
class TrainerExercisesRepositoryRaceTest {

    private val api = FakeTrainerExercisesApi().apply {
        exercises = exercises + trainerExerciseDto("o1", "Curl", "biceps", global = false)
    }
    private val repo = TrainerExercisesRepository(api, FakeTrainerExercisesDao())

    private suspend fun ids() = repo.observe("t1").first().map { it.id }

    /** Arranca un refresh que toma la foto del servidor y queda esperando a [gate]. */
    private fun TestScope.slowRefresh(gate: CompletableDeferred<Unit>) {
        api.listGate = gate
        launch { repo.refresh("t1") }
        runCurrent()
        api.listGate = null
    }

    @Test fun `un GET atrasado no vuelve a meter un ejercicio recien borrado`() = runTest {
        repo.refresh("t1")
        val gate = CompletableDeferred<Unit>()
        slowRefresh(gate)
        val delete = launch { assertTrue(repo.delete("t1", "o1").isSuccess) }
        runCurrent()
        gate.complete(Unit)
        advanceUntilIdle()
        delete.join()
        assertFalse("o1" in ids())
    }

    @Test fun `un GET atrasado no esconde un alta`() = runTest {
        val gate = CompletableDeferred<Unit>()
        slowRefresh(gate)
        val body = buildJsonObject {
            put("name", JsonPrimitive("Curl E2E"))
            put("muscle_group", JsonPrimitive("biceps"))
        }
        var created = ""
        launch { created = repo.create("t1", body).getOrThrow() }
        runCurrent()
        gate.complete(Unit)
        advanceUntilIdle()
        assertTrue(created in ids())
    }

    @Test fun `un GET atrasado no revierte una edicion`() = runTest {
        repo.refresh("t1")
        val gate = CompletableDeferred<Unit>()
        slowRefresh(gate)
        launch { repo.update("t1", "o1", buildJsonObject { put("name", JsonPrimitive("Curl martillo")) }) }
        runCurrent()
        gate.complete(Unit)
        advanceUntilIdle()
        assertEquals("Curl martillo", repo.observe("t1").first().single { it.id == "o1" }.name)
    }
}
