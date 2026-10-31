package com.fittrainer.ui.workout.feedback

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.workout.MAX_NOTES
import com.fittrainer.data.workout.WorkoutRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class FeedbackUiState(
    val rpe: Int? = null,
    val notes: String = "",
    val saving: Boolean = false,
    val error: Boolean = false,
    val done: Boolean = false,
) {
    val canSave: Boolean get() = !saving && (rpe != null || notes.isNotBlank())
}

/** Feedback post-entreno (tarjeta 12). Salteable: no guardar no bloquea nada. */
@HiltViewModel
class FeedbackViewModel @Inject constructor(private val repository: WorkoutRepository) : ViewModel() {
    private val _state = MutableStateFlow(FeedbackUiState())
    val state: StateFlow<FeedbackUiState> = _state

    /** Tocar el elegido lo desmarca. */
    fun onRpe(value: Int) = _state.update { it.copy(rpe = if (it.rpe == value) null else value) }

    fun onNotes(value: String) = _state.update { it.copy(notes = value.take(MAX_NOTES)) }

    fun dismissError() = _state.update { it.copy(error = false) }

    fun save(sessionId: String) {
        val current = _state.value
        if (!current.canSave) return
        _state.update { it.copy(saving = true, error = false) }
        viewModelScope.launch {
            try {
                repository.saveFeedback(sessionId, current.rpe, current.notes)
                _state.update { it.copy(saving = false, done = true) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(saving = false, error = true) }
            }
        }
    }
}
