package com.fittrainer.ui.routines.trainer.ai.assign

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.data.trainerai.AiRoutineProposal
import com.fittrainer.data.trainerai.TrainerAiRepository
import com.fittrainer.data.trainerai.toDomain
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.testing.fakes.trainerai.FakeTrainerAiApi
import com.fittrainer.testing.fakes.trainerai.proposalDto
import java.io.IOException
import java.time.Clock
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** E15: "Guardar y asignar". El alumno s1 tiene la rutina r1 activa (la de los fakes). */
@OptIn(ExperimentalCoroutinesApi::class)
class AiAssignControllerTest {
    @get:Rule val main = MainDispatcherRule()

    val aiApi = FakeTrainerAiApi().apply { generated = proposalDto(3) }
    val templatesApi = FakeTrainerTemplatesApi()
    val routinesApi = FakeTrainerRoutinesApi()
    val routines = TrainerRoutinesRepository(routinesApi, FakeTrainerRoutinesDao(), Clock.systemUTC())
    val templates = TrainerTemplatesRepository(templatesApi, FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    val saved = SavedStateHandle()
    val proposal: AiRoutineProposal = proposalDto(3).toDomain()
    val stops = mutableListOf<AiAssignStop>()
    val stopTexts = mutableListOf<String>()
    private fun progress(deactivate: List<String> = emptyList()) = AiAssignProgress("s1", "IA · Fuerza", deactivate, existingIds = listOf("r1"))
    private fun TestScope.controller() =
        AiAssignController(TrainerAiRepository(aiApi), templates, routines, saved, this, { "t1" }) { stop, text -> stops += stop; stopTexts += text }

    @Test fun `guarda una vez y asigna cada bloque con su nombre y sus dias`() = runTest {
        val c = controller()
        c.start(proposal, progress())
        advanceUntilIdle()
        assertEquals(1, aiApi.saves.size)
        assertEquals(listOf("tpl-0", "tpl-1", "tpl-2"), templatesApi.instantiates.map { it.first })
        assertEquals(listOf("Pecho y tríceps", "Espalda y bíceps", "Piernas"), templatesApi.instantiates.map { it.second.name })
        assertEquals(listOf("friday"), templatesApi.instantiates[2].second.days)
        assertNull(c.done.value!!.warning)
        assertTrue(c.progress!!.done)
    }

    @Test fun `un doble toque no guarda dos veces`() = runTest {
        aiApi.saveGate = CompletableDeferred()
        val c = controller()
        c.start(proposal, progress())
        c.start(proposal, progress())
        aiApi.saveGate!!.complete(Unit)
        advanceUntilIdle()
        assertEquals(1, aiApi.saves.size)
        assertEquals(3, templatesApi.instantiates.size)
    }

    @Test fun `pausa las rutinas activas de antes y no las nuevas`() = runTest {
        val c = controller()
        c.start(proposal, progress(deactivate = listOf("r1")))
        advanceUntilIdle()
        assertEquals(false, routinesApi.server.getValue("r1").active)
        assertNull(c.done.value!!.warning)
    }

    @Test fun `si no puede pausar avisa sin deshacer la asignacion`() = runTest {
        routinesApi.updateError = IOException()
        val c = controller()
        c.start(proposal, progress(deactivate = listOf("r1")))
        advanceUntilIdle()
        assertEquals(pauseFailed(listOf("Push")), c.done.value!!.warning)
        assertEquals(3, templatesApi.instantiates.size)
    }

    @Test fun `con la red cortada al guardar avisa y deja reintentar`() = runTest {
        aiApi.saveErrors += IOException()
        val c = controller()
        c.start(proposal, progress())
        advanceUntilIdle()
        assertTrue(c.state.value.canRetry)
        assertNotNull(c.state.value.message)
        assertTrue(templatesApi.instantiates.isEmpty())
        c.retry(proposal)
        advanceUntilIdle()
        assertEquals(2, aiApi.saves.size)
        assertNotNull(c.done.value)
    }

    @Test fun `la propuesta que ya no existe corta el flujo`() = runTest {
        aiApi.saveErrors += com.fittrainer.testing.fakes.auth.apiError(404, "GENERATION_NOT_FOUND")
        val c = controller()
        c.start(proposal, progress())
        advanceUntilIdle()
        assertEquals(listOf(AiAssignStop.GENERATION_GONE), stops)
        assertNull(c.progress)
    }

    @Test fun `si no encuentra la rutina a pausar no calla`() = runTest {
        // Sin poder leer la lista no se asigna (ronda 1 de Codex): la rutina a pausar desaparece mientras asigna.
        val gate = CompletableDeferred<Unit>()
        templatesApi.instantiateGate = gate
        val c = controller()
        c.start(proposal, progress(deactivate = listOf("r1")))
        advanceUntilIdle()
        routinesApi.server.remove("r1")
        gate.complete(Unit)
        advanceUntilIdle()
        assertEquals(pauseFailed(listOf(PREVIOUS_ROUTINES)), c.done.value!!.warning)
    }

    @Test fun `sin poder leer las rutinas del alumno no asigna a ciegas`() = runTest {
        routinesApi.listError = IOException()
        val c = controller()
        c.start(proposal, progress())
        advanceUntilIdle()
        assertTrue(templatesApi.instantiates.isEmpty())
        assertTrue(c.state.value.canRetry)
    }

    @Test fun `un ejercicio que dejo de estar disponible corta con el texto de la spec y no el del backend`() = runTest {
        aiApi.saveErrors += com.fittrainer.testing.fakes.auth.apiError(400, "TEMPLATE_EXERCISES_UNAVAILABLE")
        val c = controller()
        c.start(proposal, progress())
        advanceUntilIdle()
        assertEquals(listOf(AiAssignStop.EXERCISES_UNAVAILABLE), stops)
        assertEquals(listOf(EXERCISES_GONE), stopTexts)
        assertNull(c.progress)
    }
}
