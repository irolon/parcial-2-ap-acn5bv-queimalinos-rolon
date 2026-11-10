package com.fittrainer.testing.fakes.trainerai

import com.fittrainer.data.api.trainerai.GenerateRoutineRequest
import com.fittrainer.data.api.trainerai.GenerateRoutineResponse
import com.fittrainer.data.api.trainerai.GeneratedRoutineDto
import com.fittrainer.data.api.trainerai.ProposalBlockDto
import com.fittrainer.data.api.trainerai.ProposalExerciseDto
import com.fittrainer.data.api.trainerai.RoutineProposalDto
import com.fittrainer.data.api.trainerai.SaveAsTemplateRequest
import com.fittrainer.data.api.trainerai.SaveAsTemplateResponse
import com.fittrainer.data.api.trainerai.SavedTemplateDto
import com.fittrainer.data.api.trainerai.SavedTemplatesDto
import com.fittrainer.data.api.trainerai.TrainerAiApi
import com.fittrainer.data.auth.RequiredUser
import kotlinx.coroutines.CompletableDeferred

private val BLOCKS = listOf(
    ProposalBlockDto("Pecho y tríceps", listOf("monday"), listOf(ProposalExerciseDto("e1", "Press de banca", 4, 8, 90, 60.0, "Controlá la bajada"))),
    ProposalBlockDto("Espalda y bíceps", listOf("wednesday"), listOf(ProposalExerciseDto("e2", "Remo", 4, 10, 90))),
    ProposalBlockDto("Piernas", listOf("friday"), listOf(ProposalExerciseDto("e3", "Sentadilla", 4, 6, 120, 80.0))),
)

/** Propuesta de [blocks] bloques (1 a 3); con 1, "Pecho y tríceps" los lunes. */
fun proposalDto(blocks: Int = 1) = GeneratedRoutineDto("g1", RoutineProposalDto(BLOCKS.take(blocks), "Porque sí"))

/** Backend de /trainer-ai en memoria. Las colas de errores fallan la próxima llamada; los gates la demoran. */
class FakeTrainerAiApi : TrainerAiApi {
    var generated = proposalDto()
    val generateErrors = ArrayDeque<Throwable>()
    val saveErrors = ArrayDeque<Throwable>()
    var generateGate: CompletableDeferred<Unit>? = null
    var saveGate: CompletableDeferred<Unit>? = null
    val requests = mutableListOf<GenerateRoutineRequest>()
    val saves = mutableListOf<SaveAsTemplateRequest>()
    val owners = mutableListOf<String>()

    /** Lo que devuelve save: una plantilla por bloque, "tpl-<i>". */
    fun savedTemplates(name: String) = generated.proposal.routines.mapIndexed { i, b ->
        SavedTemplateDto("tpl-$i", if (generated.proposal.routines.size == 1) name else "$name · ${b.name}", b.days)
    }

    override suspend fun generate(owner: RequiredUser, body: GenerateRoutineRequest): GenerateRoutineResponse {
        owners += owner.userId
        requests += body
        generateGate?.await()
        generateErrors.removeFirstOrNull()?.let { throw it }
        return GenerateRoutineResponse(generated)
    }

    override suspend fun save(owner: RequiredUser, body: SaveAsTemplateRequest): SaveAsTemplateResponse {
        owners += owner.userId
        saves += body
        saveGate?.await()
        saveErrors.removeFirstOrNull()?.let { throw it }
        return SaveAsTemplateResponse(SavedTemplatesDto(body.generationId, savedTemplates(body.templateName)))
    }
}
