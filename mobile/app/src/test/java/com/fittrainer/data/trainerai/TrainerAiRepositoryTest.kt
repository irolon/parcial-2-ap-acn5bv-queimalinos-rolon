package com.fittrainer.data.trainerai

import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.trainerai.FakeTrainerAiApi
import com.fittrainer.testing.fakes.trainerai.proposalDto
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** E15: generar y guardar contra el backend, sin Room. */
class TrainerAiRepositoryTest {
    private val api = FakeTrainerAiApi()
    private val repo = TrainerAiRepository(api)
    private val params = AiRoutineParams("s1", "strength", "beginner", 3, 60, null, "  ", " Sin saltos ")

    @Test fun `genera con la cuenta y limpia los textos`() = runTest {
        api.generated = proposalDto(3)
        val proposal = repo.generate("t1", params).getOrThrow()
        val sent = api.requests.single()
        assertEquals("t1", api.owners.single())
        assertNull(sent.availableEquipment)
        assertNull(sent.injuries)
        assertEquals("Sin saltos", sent.preferences)
        assertEquals("g1", proposal.generationId)
        assertEquals(listOf("Pecho y tríceps", "Espalda y bíceps", "Piernas"), proposal.blocks.map { it.name })
        assertEquals("Press de banca", proposal.blocks[0].exercises[0].name)
    }

    @Test fun `los dias quedan en orden de la semana y un ejercicio sin nombre tiene uno`() = runTest {
        api.generated = proposalDto(1).let { g ->
            val b = g.proposal.routines[0]
            g.copy(proposal = g.proposal.copy(routines = listOf(b.copy(days = listOf("friday", "monday"), exercises = b.exercises.map { it.copy(exerciseName = null) }))))
        }
        val block = repo.generate("t1", params).getOrThrow().blocks.single()
        assertEquals(listOf("monday", "friday"), block.days)
        assertEquals(UNKNOWN_EXERCISE, block.exercises.single().name)
    }

    @Test fun `una falla vuelve como TrainerAiException`() = runTest {
        api.generateErrors += apiError(503, "AI_UNAVAILABLE")
        assertEquals(TrainerAiError.Unavailable("x"), (repo.generate("t1", params).exceptionOrNull() as TrainerAiException).error)
        api.generateErrors += IOException()
        assertEquals(TrainerAiError.Offline, (repo.generate("t1", params).exceptionOrNull() as TrainerAiException).error)
    }

    @Test fun `guardar recorta el nombre y devuelve una plantilla por bloque`() = runTest {
        api.generated = proposalDto(2)
        val saved = repo.save("t1", "g1", "  IA · Fuerza  ").getOrThrow()
        assertEquals("IA · Fuerza", api.saves.single().templateName)
        assertEquals(listOf("tpl-0", "tpl-1"), saved.map { it.id })
    }

    @Test fun `el nombre de cada plantilla copia al backend`() {
        assertEquals("IA", aiTemplateName("IA", "Piernas", 1))
        assertEquals("IA · Piernas", aiTemplateName("IA", "Piernas", 2))
        assertEquals(MAX_TEMPLATE_NAME, aiTemplateName("x".repeat(118), "Piernas", 3).length)
    }
}
