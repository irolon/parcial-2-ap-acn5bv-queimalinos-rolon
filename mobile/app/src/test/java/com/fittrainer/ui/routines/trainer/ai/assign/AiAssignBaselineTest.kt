package com.fittrainer.ui.routines.trainer.ai.assign

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.data.trainerai.TrainerAiRepository
import com.fittrainer.data.trainerai.toDomain
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.routines.routineDto
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
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
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Rule
import org.junit.Test

/**
 * E15, ronda 1 de Codex: una rutina que ya estaba en el servidor (creada desde la web después de abrir la pantalla,
 * así que no figura en la referencia inicial) nunca se adopta como la del bloque, y una coincidencia doble tampoco.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AiAssignBaselineTest {
    @get:Rule val main = MainDispatcherRule()

    private val aiApi = FakeTrainerAiApi().apply { generated = proposalDto(3) }
    private val templatesApi = FakeTrainerTemplatesApi()
    private val routinesApi = FakeTrainerRoutinesApi()
    private val routines = TrainerRoutinesRepository(routinesApi, FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val templates = TrainerTemplatesRepository(templatesApi, FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    private val proposal = proposalDto(3).toDomain()
    private val progress = AiAssignProgress("s1", "IA · Fuerza", emptyList(), existingIds = listOf("r1"))
    private fun TestScope.controller() = AiAssignController(TrainerAiRepository(aiApi), templates, routines, SavedStateHandle(), this, { "t1" }) { _, _ -> }
    private fun twin(id: String) = routineDto(id, "s1").copy(name = "Espalda y bíceps", days = listOf("wednesday"))

    @Test fun `una rutina igual que ya estaba en el servidor no se adopta como la del bloque`() = runTest {
        routinesApi.server["rt-web"] = twin("rt-web") // creada desde la web, no está en existingIds
        templatesApi.instantiateFailures += listOf(null, IOException())
        val c = controller()
        c.start(proposal, progress)
        advanceUntilIdle()
        c.retry(proposal)
        advanceUntilIdle()
        assertEquals(listOf("tpl-0", "tpl-1", "tpl-1", "tpl-2"), templatesApi.instantiates.map { it.first })
        assertNotEquals("rt-web", c.progress!!.assigned[1])
        assertNotNull(c.done.value)
    }

    @Test fun `dos rutinas nuevas iguales no se adoptan ni se vuelve a asignar a ciegas`() = runTest {
        templatesApi.instantiateFailures += listOf(null, IOException())
        val c = controller()
        c.start(proposal, progress)
        advanceUntilIdle()
        routinesApi.server["rt-a"] = twin("rt-a")
        routinesApi.server["rt-b"] = twin("rt-b")
        c.retry(proposal)
        advanceUntilIdle()
        assertEquals(listOf("tpl-0", "tpl-1"), templatesApi.instantiates.map { it.first })
        assertEquals(assignUnconfirmed("Espalda y bíceps"), c.state.value.message)
        assertFalse(c.state.value.canRetry)
    }
}
