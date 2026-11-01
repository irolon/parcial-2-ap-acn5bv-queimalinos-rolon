package com.fittrainer.ui.exercises.trainer.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.exercises.trainer.TrainerExercise
import com.fittrainer.data.exercises.trainer.TrainerExercisesRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.exercises.trainer.EXERCISE_DELETED
import com.fittrainer.ui.exercises.trainer.exerciseActionMessage
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.routines.trainer.picker.CatalogPicker
import com.fittrainer.ui.routines.trainer.picker.PickerState
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

/** visible: lo que muestra la lista (búsqueda + grupo del selector de E8, y "Solo míos"). */
data class TrainerLibraryUiState(
    val picker: PickerState = PickerState(),
    val onlyOwn: Boolean = false,
    val visible: List<TrainerExercise> = emptyList(),
    val offline: Boolean = false,
    val selected: TrainerExercise? = null,
    val confirmDelete: TrainerExercise? = null,
    val deleting: Boolean = false,
    val notice: String? = null,
)

/** Biblioteca del entrenador (E10): los globales y los propios, con baja de los propios. */
@HiltViewModel
class TrainerLibraryViewModel @Inject constructor(
    private val repository: TrainerExercisesRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
) : ViewModel() {

    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    /** La búsqueda y el grupo: la pantalla llama a onQuery / onGroup directo. */
    val picker = CatalogPicker(repository, viewModelScope, trainerId)
    private val local = MutableStateFlow(Local())
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)

    val uiState: StateFlow<TrainerLibraryUiState> = combine(picker.state, local, online) { p, l, on ->
        TrainerLibraryUiState(
            picker = p, onlyOwn = l.onlyOwn, visible = if (l.onlyOwn) p.visible.filter { !it.isGlobal } else p.visible,
            offline = !on, selected = l.selected, confirmDelete = l.confirmDelete, deleting = l.deleting, notice = l.notice,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), TrainerLibraryUiState())

    /** Al entrar o volver (por ejemplo, del formulario). */
    fun onStart() = picker.refresh()

    fun onToggleOnlyOwn() = local.update { it.copy(onlyOwn = !it.onlyOwn) }
    fun onSelect(exercise: TrainerExercise) = local.update { it.copy(selected = exercise) }
    fun onDismissDetail() = local.update { it.copy(selected = null) }

    /** Solo los propios se borran; pide confirmación. */
    fun onAskDelete() = local.update { l -> l.selected?.takeIf { !it.isGlobal }?.let { l.copy(confirmDelete = it) } ?: l }
    fun onCancelDelete() = local.update { if (it.deleting) it else it.copy(confirmDelete = null) }

    fun onConfirmDelete() {
        val target = local.value.confirmDelete?.takeIf { !local.value.deleting } ?: return
        if (!online.value) return local.update { it.copy(confirmDelete = null, notice = NEEDS_NETWORK) }
        local.update { it.copy(deleting = true) }
        viewModelScope.launch {
            val error = repository.delete(trainerId.filterNotNull().first(), target.id).exceptionOrNull()
            // La hoja se cierra siempre: el aviso (también el del 409, "está en uso") queda a la vista.
            local.update { it.copy(deleting = false, confirmDelete = null, selected = null, notice = error?.exerciseActionMessage() ?: EXERCISE_DELETED) }
        }
    }

    fun dismissNotice() = local.update { it.copy(notice = null) }

    private data class Local(
        val onlyOwn: Boolean = false,
        val selected: TrainerExercise? = null,
        val confirmDelete: TrainerExercise? = null,
        val deleting: Boolean = false,
        val notice: String? = null,
    )
}
