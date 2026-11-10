package com.fittrainer.ui.routines.trainer.ai

import com.fittrainer.data.routines.trainer.StudentRoutinesCache
import com.fittrainer.data.trainerai.AiRoutineProposal
import com.fittrainer.data.trainerai.TrainerAiError
import com.fittrainer.ui.routines.trainer.ai.assign.AiAssignDone
import com.fittrainer.ui.routines.trainer.ai.assign.AiAssignProgress
import com.fittrainer.ui.routines.trainer.ai.assign.AiAssignState

/** Lo que junta el ViewModel antes de armar el estado de la pantalla. */
internal data class Content(
    val form: AiRoutineForm, val proposal: AiRoutineProposal?, val local: AiRoutineLocal,
    val equipment: List<String>?, val routines: StudentRoutinesCache?,
)

internal fun Content.toUiState(offline: Boolean, a: AiAssignState, done: AiAssignDone?, progress: AiAssignProgress?) = AiRoutineUiState(
    form = form, profileEquipment = equipment?.takeIf { it.isNotEmpty() }?.joinToString(", "), proposal = proposal,
    generating = local.generating, notice = local.notice, fieldErrors = local.fieldErrors, offerManual = local.offerManual,
    offline = offline, confirmDiscard = local.confirmDiscard, savedTemplates = progress?.templates != null,
    assignStarted = progress != null,
    sheet = local.sheet, activeRoutines = routines?.routines.orEmpty().filter { it.active }, previousKnown = routines != null,
    allRoutineIds = routines?.routines.orEmpty().map { it.id }, assign = a, done = done, gone = local.gone,
)

/** El estado local después de una falla al generar: errores por campo del backend o un aviso. */
internal fun AiRoutineLocal.afterGenerateFailed(error: TrainerAiError): AiRoutineLocal {
    val fields = (error as? TrainerAiError.Validation)?.fields.orEmpty().mapNotNull { (k, v) -> aiFieldOf(k)?.let { f -> f to v } }.toMap()
    return copy(
        generating = false, gone = error == TrainerAiError.StudentGone, fieldErrors = fields,
        notice = if (fields.isEmpty()) generateMessage(error) else null, offerManual = error is TrainerAiError.Unavailable,
    )
}
