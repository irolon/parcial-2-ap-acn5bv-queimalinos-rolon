package com.fittrainer.ui.routines.trainer.ai

import com.fittrainer.data.routines.trainer.TrainerRoutineSummary
import com.fittrainer.data.trainerai.AiRoutineProposal
import com.fittrainer.ui.routines.trainer.ai.assign.AiAssignDone
import com.fittrainer.ui.routines.trainer.ai.assign.AiAssignState

/** La hoja "Guardar y asignar". deactivate: pausar las rutinas activas de antes. */
data class AiSaveSheet(val name: String, val deactivate: Boolean = true, val nameError: String? = null)

/** Lo que vive solo en memoria del ViewModel (lo demás está en el SavedStateHandle). */
data class AiRoutineLocal(
    val generating: Boolean = false,
    val notice: String? = null,
    val fieldErrors: Map<AiField, String> = emptyMap(),
    val offerManual: Boolean = false,
    val confirmDiscard: Boolean = false,
    val sheet: AiSaveSheet? = null,
    val gone: Boolean = false,
)

/**
 * Pantalla "Rutina con IA" (E15): con [proposal] null es el formulario; si no, la propuesta.
 * previousKnown: ya se sabe qué rutinas tiene el alumno (sin eso no se asigna, como en "Desde plantilla").
 */
data class AiRoutineUiState(
    val form: AiRoutineForm = AiRoutineForm(),
    val profileEquipment: String? = null,
    val proposal: AiRoutineProposal? = null,
    val generating: Boolean = false,
    val notice: String? = null,
    val fieldErrors: Map<AiField, String> = emptyMap(),
    val offerManual: Boolean = false,
    val offline: Boolean = false,
    val confirmDiscard: Boolean = false,
    val savedTemplates: Boolean = false,
    /** Ya hay un progreso de "Guardar y asignar" (aunque haya fallado): el nombre y el check dejan de editarse. */
    val assignStarted: Boolean = false,
    val sheet: AiSaveSheet? = null,
    val activeRoutines: List<TrainerRoutineSummary> = emptyList(),
    val previousKnown: Boolean = false,
    /** Todas las rutinas del alumno antes de asignar: para reconocer una creada cuya respuesta se perdió. */
    val allRoutineIds: List<String> = emptyList(),
    val assign: AiAssignState = AiAssignState(),
    val done: AiAssignDone? = null,
    val gone: Boolean = false,
) {
    val canGenerate get() = !generating && !offline && proposal == null
}
