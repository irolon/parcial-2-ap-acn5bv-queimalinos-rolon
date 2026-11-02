package com.fittrainer.ui.templates.trainer.assign

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.routines.trainer.WEEK_DAYS
import com.fittrainer.data.routines.trainer.deactivateOthers
import com.fittrainer.data.students.TrainerStudent
import com.fittrainer.data.templates.trainer.TemplateDetail
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.routines.trainer.create.deactivateFailed
import com.fittrainer.ui.templates.trainer.PICK_STUDENT
import com.fittrainer.ui.templates.trainer.PREVIOUS_FAILED
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * La asignación de una plantilla a un alumno (E9), aparte del ViewModel del detalle. Un solo POST: un
 * doble toque, o un toque entre que se asignó y que se navegó, no asigna dos veces.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AssignTemplateController(
    private val templates: TrainerTemplatesRepository,
    private val routines: TrainerRoutinesRepository,
    private val scope: CoroutineScope,
    private val trainerId: suspend () -> String,
    private val isOffline: () -> Boolean,
    private val onGone: () -> Unit,
) {
    private val _state = MutableStateFlow<AssignState?>(null)
    val state: StateFlow<AssignState?> = _state
    /** La navegación al editor: un evento que la pantalla consume una sola vez ([consumeDone]). */
    private val _done = MutableStateFlow<AssignDone?>(null)
    val done: StateFlow<AssignDone?> = _done
    private var routinesJob: Job? = null

    /** Abre la hoja con el nombre y los días de la plantilla. Sin alumno fijo, primero se elige. */
    fun open(template: TemplateDetail, fixed: TrainerStudent?) {
        if (_done.value != null) return
        _state.value = AssignState(
            name = template.summary.name,
            days = template.summary.days.filter { it in WEEK_DAYS }.toSet(),
            pickingStudent = fixed == null,
        )
        fixed?.let { select(it, isFixed = true) }
    }

    fun onPickStudent() = _state.update { it?.copy(pickingStudent = true) }

    /**
     * Elige el alumno y busca sus rutinas activas. Si el GET falla se usa el caché; sin caché queda en
     * FAILED y no se puede asignar hasta reintentar (asignar "a ciegas" dejaría dos rutinas activas).
     */
    fun select(student: TrainerStudent, isFixed: Boolean = false) {
        _state.update {
            it?.copy(
                student = student, fixedStudent = isFixed, pickingStudent = false, activeRoutines = emptyList(),
                previous = PreviousRoutines.LOADING, message = null,
            )
        }
        routinesJob?.cancel()
        routinesJob = scope.launch {
            val t = trainerId()
            routines.refreshList(t, student.id)
            val cache = routines.observeStudentRoutines(t, student.id).first()
            _state.update { s ->
                when {
                    s?.student?.id != student.id -> s
                    cache == null -> s.copy(previous = PreviousRoutines.FAILED, message = PREVIOUS_FAILED)
                    else -> s.copy(previous = PreviousRoutines.READY, activeRoutines = cache.routines.filter { it.active })
                }
            }
        }
    }

    /** "Reintentar" cuando no se pudieron ver las rutinas activas del alumno. */
    fun retryPrevious() {
        val s = _state.value ?: return
        s.student?.let { select(it, s.fixedStudent) }
    }

    fun onNameChange(name: String) = _state.update { it?.copy(name = name, errors = emptyMap(), message = null) }
    fun onToggleDay(day: String) = _state.update { s -> s?.copy(days = if (day in s.days) s.days - day else s.days + day, errors = emptyMap()) }
    fun onToggleDeactivate(on: Boolean) = _state.update { it?.copy(deactivateCurrent = on) }
    /** Ya navegó: al volver al detalle no se vuelve a abrir el editor, y se puede asignar de nuevo. */
    fun consumeDone() {
        _done.value = null
    }

    fun dismiss() = _state.update { if (it?.submitting == true) it else null }

    fun submit(templateId: String) {
        val s = _state.value ?: return
        if (s.submitting || _done.value != null) return
        val student = s.student ?: return _state.update { it?.copy(message = PICK_STUDENT, pickingStudent = true) }
        if (isOffline()) return _state.update { it?.copy(message = NEEDS_NETWORK) }
        if (s.previous == PreviousRoutines.FAILED) return _state.update { it?.copy(message = PREVIOUS_FAILED) }
        if (s.previous != PreviousRoutines.READY) return
        val errors = s.validationErrors()
        if (errors.isNotEmpty()) return _state.update { it?.copy(errors = errors) }
        val previous = if (s.deactivateCurrent) s.activeRoutines else emptyList()
        _state.update { it?.copy(submitting = true, message = null) }
        scope.launch {
            val t = trainerId()
            val days = WEEK_DAYS.filter { it in s.days }
            val result = templates.instantiate(t, templateId, student.id, s.name.trim(), days)
            val id = result.getOrElse { error ->
                if ((error as? DataException)?.error == DataError.NotFound) onGone()
                return@launch _state.update { it?.copy(submitting = false, message = error.assignMessage(), errors = error.assignFieldErrors()) }
            }
            val failed = routines.deactivateOthers(t, previous, keepId = id)
            routines.refreshList(t, student.id)
            _done.value = AssignDone(id, failed.takeIf { it.isNotEmpty() }?.let(::deactivateFailed))
            _state.value = null
        }
    }
}
