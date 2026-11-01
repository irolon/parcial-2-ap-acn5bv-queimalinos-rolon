package com.fittrainer.ui.exercises.trainer.form

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.exercises.trainer.ExerciseRejectedException
import com.fittrainer.data.exercises.trainer.TrainerExercise
import com.fittrainer.data.exercises.trainer.TrainerExercisesRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.exercises.trainer.exerciseActionMessage
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

const val EXERCISE_ID_ARG = "exerciseId"

/** loaded: en edición, ya se leyó el ejercicio del caché. done: se guardó; la pantalla vuelve. */
data class ExerciseFormUiState(
    val editing: Boolean = false,
    val loaded: Boolean = false,
    val input: ExerciseFormInput = ExerciseFormInput(),
    val errors: Map<ExerciseFormField, String> = emptyMap(),
    val message: String? = null,
    val saving: Boolean = false,
    val offline: Boolean = false,
    val done: Boolean = false,
    val gone: Boolean = false,
)

/** Alta (sin [EXERCISE_ID_ARG]) o edición de un ejercicio propio (E10). Solo con red; un solo envío por vez. */
@HiltViewModel
class ExerciseFormViewModel @Inject constructor(
    private val repository: TrainerExercisesRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    saved: SavedStateHandle,
) : ViewModel() {

    private val exerciseId: String? = saved[EXERCISE_ID_ARG]
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val form = MutableStateFlow(ExerciseFormUiState(editing = exerciseId != null, loaded = exerciseId == null))
    private var before: TrainerExercise? = null

    val uiState: StateFlow<ExerciseFormUiState> = combine(form, connectivity.isOnline) { f, online -> f.copy(offline = !online) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, form.value)

    private suspend fun trainer() = trainerId.filterNotNull().first()

    init {
        exerciseId?.let { id ->
            viewModelScope.launch {
                val e = repository.observe(trainer()).first().firstOrNull { it.id == id }
                before = e
                form.update { if (e == null || e.isGlobal) it.copy(gone = true) else it.copy(loaded = true, input = e.toFormInput()) }
            }
        }
    }

    fun onChange(change: (ExerciseFormInput) -> ExerciseFormInput) =
        form.update { it.copy(input = change(it.input), errors = emptyMap(), message = null) }

    fun onSave() {
        val f = form.value
        if (f.saving || f.done || !f.loaded) return
        if (uiState.value.offline) return form.update { it.copy(message = NEEDS_NETWORK) }
        val errors = f.input.errors()
        if (errors.isNotEmpty()) return form.update { it.copy(errors = errors) }
        val previous = before
        val patch = previous?.let { f.input.patch(it) }
        if (previous != null && patch == null) return form.update { it.copy(done = true) }
        form.update { it.copy(saving = true, message = null) }
        viewModelScope.launch {
            val t = trainer()
            val error = if (previous == null) repository.create(t, f.input.toCreateBody()).exceptionOrNull()
            else repository.update(t, previous.id, patch!!).exceptionOrNull()
            form.update { s ->
                when {
                    error == null -> s.copy(saving = false, done = true)
                    (error as? DataException)?.error == DataError.NotFound -> s.copy(saving = false, gone = true)
                    else -> s.copy(saving = false, message = error.exerciseActionMessage(), errors = error.fieldErrors())
                }
            }
        }
    }

    private fun Throwable.fieldErrors(): Map<ExerciseFormField, String> =
        (this as? ExerciseRejectedException)?.fields.orEmpty().mapNotNull { (k, v) -> exerciseFormFieldOf(k)?.let { it to v } }.toMap()
}
