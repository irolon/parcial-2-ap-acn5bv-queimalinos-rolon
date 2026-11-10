package com.fittrainer.ui.routines.trainer.ai.assign

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.data.trainerai.AiRoutineProposal
import com.fittrainer.data.trainerai.TrainerAiRepository
import com.fittrainer.data.trainerai.toDomain
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.routines.routineDto
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.testing.fakes.templates.templateDto
import com.fittrainer.testing.fakes.trainerai.FakeTrainerAiApi
import com.fittrainer.testing.fakes.trainerai.proposalDto
import java.io.IOException
import java.time.Clock
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** E15: respuestas perdidas, fallas en un bloque y Android que mata el proceso a mitad de camino. */
@OptIn(ExperimentalCoroutinesApi::class)
class AiAssignRecoveryTest {
    @get:Rule val main = MainDispatcherRule()

    private val aiApi = FakeTrainerAiApi().apply { generated = proposalDto(3) }
    private val templatesApi = FakeTrainerTemplatesApi()
    private val routinesApi = FakeTrainerRoutinesApi()
    private val routines = TrainerRoutinesRepository(routinesApi, FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val templates = TrainerTemplatesRepository(templatesApi, FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    private val saved = SavedStateHandle()
    private val proposal = proposalDto(3).toDomain()
    private val progress = AiAssignProgress("s1", "IA · Fuerza", emptyList(), existingIds = listOf("r1"))
    private fun TestScope.controller() = AiAssignController(TrainerAiRepository(aiApi), templates, routines, saved, this, { "t1" }) { _, _ -> }

    /** Las tres plantillas que dejó el guardado perdido, con los días de cada bloque. */
    private fun serverTemplates() = listOf("Pecho y tríceps" to "monday", "Espalda y bíceps" to "wednesday", "Piernas" to "friday")
        .forEachIndexed { i, (b, d) -> templatesApi.server["ai-$i"] = templateDto("ai-$i", "IA · Fuerza · $b", listOf(d)) }

    /** Arranca con las fallas que el test cargó en instantiateFailures (una entrada por llamada). */
    private suspend fun TestScope.failSecondBlock(c: AiAssignController) {
        c.start(proposal, progress)
        advanceUntilIdle()
    }

    @Test fun `si falla el bloque 2 reintentar sigue desde ahi sin volver a guardar`() = runTest {
        templatesApi.instantiateFailures += listOf(null, IOException())
        val c = controller()
        failSecondBlock(c)
        assertEquals(1, c.state.value.assigned)
        assertTrue(c.state.value.canRetry)
        assertTrue(c.state.value.message!!.contains(assignedOf(1, 3)))
        c.retry(proposal)
        advanceUntilIdle()
        assertEquals(1, aiApi.saves.size)
        assertEquals(listOf("tpl-0", "tpl-1", "tpl-1", "tpl-2"), templatesApi.instantiates.map { it.first })
        assertNotNull(c.done.value)
    }

    @Test fun `un bloque que se creo aunque no llego la respuesta no se duplica`() = runTest {
        templatesApi.instantiateFailures += listOf(null, IOException())
        val c = controller()
        failSecondBlock(c)
        // El POST del bloque 2 había llegado al backend: la rutina existe aunque el celular no se enteró.
        routinesApi.server["rt-lost"] = routineDto("rt-lost", "s1").copy(name = "Espalda y bíceps", days = listOf("wednesday"))
        c.retry(proposal)
        advanceUntilIdle()
        assertEquals(listOf("tpl-0", "tpl-1", "tpl-2"), templatesApi.instantiates.map { it.first })
        assertEquals("rt-lost", c.progress!!.assigned[1])
    }

    @Test fun `el 409 de guardar se recupera con las plantillas de la lista`() = runTest {
        aiApi.saveErrors += apiError(409, "GENERATION_ALREADY_SAVED")
        serverTemplates()
        val c = controller()
        c.start(proposal, progress)
        advanceUntilIdle()
        assertEquals(listOf("ai-0", "ai-1", "ai-2"), templatesApi.instantiates.map { it.first })
        assertNotNull(c.done.value)
    }

    @Test fun `un 409 sin las plantillas en la lista no se puede recuperar`() = runTest {
        aiApi.saveErrors += apiError(409, "GENERATION_ALREADY_SAVED")
        val c = controller()
        c.start(proposal, progress)
        advanceUntilIdle()
        assertEquals(ASSIGN_NOT_RECOVERED, c.state.value.message)
        assertFalse(c.state.value.canRetry)
        assertTrue(templatesApi.instantiates.isEmpty())
    }

    @Test fun `con el proceso muerto a mitad de camino el progreso vuelve y no se guarda de nuevo`() = runTest {
        templatesApi.instantiateFailures += listOf(null, IOException())
        failSecondBlock(controller())
        val revived = controller()
        revived.restore(proposal)
        assertEquals(1, revived.state.value.assigned)
        assertTrue(revived.state.value.canRetry)
        revived.retry(proposal)
        advanceUntilIdle()
        assertEquals(1, aiApi.saves.size)
        assertNotNull(revived.done.value)
    }

    @Test fun `restore sin progreso no hace nada`() = runTest {
        val c = controller()
        c.restore(proposal)
        assertNull(c.progress)
        assertFalse(c.state.value.canRetry)
    }

    @Test fun `un 409 con la lista caida se puede reintentar y despues se recupera`() = runTest {
        aiApi.saveErrors += apiError(409, "GENERATION_ALREADY_SAVED")
        serverTemplates()
        templatesApi.error = IOException()
        val c = controller()
        c.start(proposal, progress)
        advanceUntilIdle()
        assertTrue(c.state.value.canRetry)
        assertEquals(NEEDS_NETWORK_OR_RETRY, c.state.value.message)
        templatesApi.error = null
        aiApi.saveErrors += apiError(409, "GENERATION_ALREADY_SAVED")
        c.retry(proposal)
        advanceUntilIdle()
        assertEquals(listOf("ai-0", "ai-1", "ai-2"), templatesApi.instantiates.map { it.first })
        assertNotNull(c.done.value)
    }

    @Test fun `restore con la corrida terminada avisa que termino`() = runTest {
        val done = progress.copy(templates = emptyList(), assigned = listOf("a", "b", "c"), done = true)
        saved["ai_assign_progress"] = kotlinx.serialization.json.Json.encodeToString(AiAssignProgress.serializer(), done)
        val c = controller()
        c.restore(proposal)
        assertNotNull(c.done.value)
    }

    @Test fun `dos bloques con el mismo nombre y distintos dias recuperan cada plantilla por sus dias`() = runTest {
        val twin = AiRoutineProposal("g1", proposal.blocks.take(2).map { it.copy(name = "Full body") }, "x")
        aiApi.saveErrors += apiError(409, "GENERATION_ALREADY_SAVED")
        templatesApi.server["a-wed"] = templateDto("a-wed", "IA · Fuerza · Full body", listOf("wednesday"))
        templatesApi.server["a-mon"] = templateDto("a-mon", "IA · Fuerza · Full body", listOf("monday"))
        val c = controller()
        c.start(twin, progress)
        advanceUntilIdle()
        assertEquals(listOf("a-mon", "a-wed"), templatesApi.instantiates.map { it.first })
        assertNotNull(c.done.value)
    }

    @Test fun `un caso ambiguo no se recupera ni asigna nada`() = runTest {
        // Mismo nombre y mismos dias en los dos bloques: no hay forma de saber cual plantilla es cual.
        val same = AiRoutineProposal("g1", proposal.blocks.take(2).map { it.copy(name = "Full body", days = listOf("monday")) }, "x")
        aiApi.saveErrors += apiError(409, "GENERATION_ALREADY_SAVED")
        templatesApi.server["a1"] = templateDto("a1", "IA · Fuerza · Full body", listOf("monday"))
        templatesApi.server["a2"] = templateDto("a2", "IA · Fuerza · Full body", listOf("monday"))
        val c = controller()
        c.start(same, progress)
        advanceUntilIdle()
        assertEquals(ASSIGN_NOT_RECOVERED, c.state.value.message)
        assertFalse(c.state.value.canRetry)
        assertTrue(templatesApi.instantiates.isEmpty())
    }
}
