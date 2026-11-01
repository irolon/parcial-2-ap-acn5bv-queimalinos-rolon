package com.fittrainer.ui.students.edit

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.data.students.detail.EditField
import com.fittrainer.data.students.detail.EditableStudent
import com.fittrainer.data.students.detail.StudentDetail
import com.fittrainer.data.students.detail.StudentRejectedException
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.students.detail.diffPatch
import com.fittrainer.data.students.detail.errors
import com.fittrainer.data.students.detail.toEditable
import com.fittrainer.ui.students.detail.DETAIL_ACTION_FAILED
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.LocalDate
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * before == null: la ficha todavía no está en Room. saved: el PATCH salió bien y hay que volver.
 * gone: el alumno ya no es del entrenador (403/404); es terminal: se avisa y se vuelve a la lista.
 */
data class EditStudentUiState(
    val before: StudentDetail? = null,
    val form: EditableStudent? = null,
    val errors: Map<EditField, String> = emptyMap(),
    val offline: Boolean = false,
    val saving: Boolean = false,
    val notice: String? = null,
    val saved: Boolean = false,
    val gone: Boolean = false,
) {
    val hasChanges: Boolean get() = before != null && form != null && diffPatch(before, form) != null
    val canSave: Boolean get() = hasChanges && !offline && !saving && !gone
}

/** Edita la ficha desde lo cacheado y manda un PATCH solo con lo que cambió (online). */
@HiltViewModel
class EditStudentViewModel @Inject constructor(
    private val repository: TrainerStudentDetailRepository,
    private val sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
    saved: SavedStateHandle,
) : ViewModel() {

    private val studentId: String = checkNotNull(saved[STUDENT_ID_ARG])
    private val _state = MutableStateFlow(EditStudentUiState())
    val state: StateFlow<EditStudentUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch { connectivity.isOnline.collect { online -> _state.update { it.copy(offline = !online) } } }
        viewModelScope.launch {
            val detail = repository.observe(trainerId(), studentId).filterNotNull().first().detail
            _state.update { it.copy(before = detail, form = detail.toEditable()) }
        }
    }

    fun today(): LocalDate = LocalDate.ofInstant(clock.instant(), ARGENTINA)

    fun onChange(change: (EditableStudent) -> EditableStudent, field: EditField) = _state.update { s ->
        val form = s.form ?: return@update s
        s.copy(form = change(form), errors = s.errors - field)
    }

    fun onSave() {
        val s = _state.value
        val before = s.before ?: return
        val form = s.form ?: return
        if (!s.canSave) return
        val errors = form.errors(today())
        if (errors.isNotEmpty()) {
            _state.update { it.copy(errors = errors) }
            return
        }
        val patch = diffPatch(before, form) ?: return
        _state.update { it.copy(saving = true, notice = null) }
        viewModelScope.launch {
            val error = repository.update(trainerId(), studentId, patch).exceptionOrNull()
            _state.update {
                when (error) {
                    null -> it.copy(saving = false, saved = true)
                    is StudentRejectedException -> it.copy(saving = false, errors = error.fields, notice = error.messageText)
                    else -> if ((error as? DataException)?.error == DataError.NotFound) {
                        it.copy(saving = false, gone = true)
                    } else {
                        it.copy(saving = false, notice = DETAIL_ACTION_FAILED)
                    }
                }
            }
        }
    }

    fun dismissNotice() = _state.update { it.copy(notice = null) }

    private suspend fun trainerId(): String =
        sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }.filterNotNull().first()
}
