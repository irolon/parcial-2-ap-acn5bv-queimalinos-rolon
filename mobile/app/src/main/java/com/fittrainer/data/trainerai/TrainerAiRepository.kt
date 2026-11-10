package com.fittrainer.data.trainerai

import com.fittrainer.data.api.trainerai.SaveAsTemplateRequest
import com.fittrainer.data.api.trainerai.TrainerAiApi
import com.fittrainer.data.auth.RequiredUser
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException

/**
 * Asistente IA del entrenador (E15), solo online y sin Room: la propuesta es el borrador de una escritura y el
 * backend no tiene un GET para releerla (la guarda el ViewModel en su SavedStateHandle). Las rutinas que salen
 * de ahí entran a Room por TrainerTemplatesRepository.instantiate y TrainerRoutinesRepository.refreshList.
 */
@Singleton
class TrainerAiRepository @Inject constructor(private val api: TrainerAiApi) {

    suspend fun generate(trainerId: String, params: AiRoutineParams): Result<AiRoutineProposal> = call {
        api.generate(RequiredUser(trainerId), params.toRequest()).data.toDomain()
    }

    /** Una plantilla por bloque, en orden. El nombre va recortado (el backend también lo recorta). */
    suspend fun save(trainerId: String, generationId: String, templateName: String): Result<List<AiSavedTemplate>> = call {
        api.save(RequiredUser(trainerId), SaveAsTemplateRequest(generationId, templateName.trim()))
            .data.templates.map { AiSavedTemplate(it.id, it.name) }
    }

    private suspend fun <T> call(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(TrainerAiException(e.toTrainerAiError(), e))
    }
}
