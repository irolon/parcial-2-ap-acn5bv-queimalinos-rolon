package com.fittrainer.ui.routines.trainer.editor

import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.templates.trainer.SAVED_AS_TEMPLATE
import com.fittrainer.ui.templates.trainer.assign.assignMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** La hoja "Guardar como plantilla" abierta: nombre (prellenado con el de la rutina) y nivel opcional. */
data class SaveTemplateState(
    val name: String,
    val level: String? = null,
    val nameError: String? = null,
    val message: String? = null,
    val saving: Boolean = false,
)

/**
 * "Guardar como plantilla" desde el editor (extra de E9): POST /routine-templates/from-routine con la rutina
 * tal como está en el servidor. Solo con red. Al terminar, [notice] avisa "Guardada como plantilla".
 */
class SaveAsTemplateController(
    private val templates: TrainerTemplatesRepository,
    private val scope: CoroutineScope,
    private val routineId: String,
    private val trainerId: suspend () -> String,
    private val isOffline: () -> Boolean,
    private val notice: (String) -> Unit,
) {
    private val _state = MutableStateFlow<SaveTemplateState?>(null)
    val state: StateFlow<SaveTemplateState?> = _state

    fun open(routineName: String) {
        _state.value = SaveTemplateState(routineName)
    }

    fun onName(name: String) = _state.update { it?.copy(name = name, nameError = null, message = null) }
    fun onLevel(level: String?) = _state.update { it?.copy(level = level) }
    fun dismiss() = _state.update { if (it?.saving == true) it else null }

    fun save() {
        val s = _state.value?.takeIf { !it.saving } ?: return
        if (isOffline()) return _state.update { it?.copy(message = NEEDS_NETWORK) }
        if (s.name.trim().length !in 2..120) return _state.update { it?.copy(nameError = "Entre 2 y 120 caracteres") }
        _state.update { it?.copy(saving = true, message = null) }
        scope.launch {
            val error = templates.saveFromRoutine(trainerId(), routineId, s.name.trim(), s.level).exceptionOrNull()
            if (error == null) {
                _state.value = null
                notice(SAVED_AS_TEMPLATE)
            } else {
                _state.update { it?.copy(saving = false, message = error.assignMessage()) }
            }
        }
    }
}
