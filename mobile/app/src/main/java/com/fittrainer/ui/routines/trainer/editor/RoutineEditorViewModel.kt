package com.fittrainer.ui.routines.trainer.editor

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.exercises.trainer.TrainerExercise
import com.fittrainer.data.exercises.trainer.TrainerExercisesRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.routines.trainer.ExerciseFormResult
import com.fittrainer.data.routines.trainer.ExerciseInput
import com.fittrainer.data.routines.trainer.NewRoutineExercise
import com.fittrainer.data.routines.trainer.RoutineHeaderInput
import com.fittrainer.data.routines.trainer.TrainerRoutineDetail
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.routines.trainer.errors
import com.fittrainer.data.routines.trainer.exercisePatch
import com.fittrainer.data.routines.trainer.headerPatch
import com.fittrainer.data.routines.trainer.routineActivePatch
import com.fittrainer.data.routines.trainer.toHeaderInput
import com.fittrainer.data.routines.trainer.toInput
import com.fittrainer.data.routines.trainer.validate
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.routines.trainer.components.ExerciseSheetState
import com.fittrainer.ui.routines.trainer.picker.CatalogPicker
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

const val ROUTINE_ID_ARG = "routineId"

/** Editor de una rutina del alumno (E8). Todo sale de Room; cada cambio es un PATCH al tocar Guardar. */
@HiltViewModel
class RoutineEditorViewModel @Inject constructor(
    private val repository: TrainerRoutinesRepository,
    exercises: TrainerExercisesRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    saved: SavedStateHandle,
) : ViewModel() {

    private val routineId: String = checkNotNull(saved[ROUTINE_ID_ARG])
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val local = MutableStateFlow(EditorLocal())
    private val picker = CatalogPicker(exercises, viewModelScope, trainerId)

    @OptIn(ExperimentalCoroutinesApi::class)
    private val detail = trainerId.filterNotNull().flatMapLatest { repository.observeRoutine(it, routineId) }
        .map<TrainerRoutineDetail?, Pair<Boolean, TrainerRoutineDetail?>> { true to it }
        .onStart { emit(false to null) }

    val uiState: StateFlow<RoutineEditorUiState> = combine(detail, connectivity.isOnline, local, picker.state) { d, online, l, p ->
        RoutineEditorUiState(
            loaded = d.first, detail = d.second, offline = !online, busy = l.busy, exerciseSheet = l.exerciseSheet,
            headerSheet = l.headerSheet, picking = l.picking, picker = p, notice = l.notice, gone = l.gone,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), RoutineEditorUiState())

    private suspend fun trainer() = trainerId.filterNotNull().first()
    private fun current() = uiState.value.detail

    fun onStart() {
        viewModelScope.launch {
            val error = repository.refreshRoutine(trainer(), routineId).exceptionOrNull()
            if (error?.isGone() == true) local.update { it.copy(gone = true) }
        }
    }

    fun onToggleActive(active: Boolean) = act { repository.update(it, routineId, routineActivePatch(active)) }

    fun onMove(routineExerciseId: String, up: Boolean) {
        val ids = current()?.exercises?.map { it.id } ?: return
        val from = ids.indexOf(routineExerciseId)
        val to = if (up) from - 1 else from + 1
        if (from < 0 || to !in ids.indices || !uiState.value.canEdit) return
        val next = ids.toMutableList().apply { add(to, removeAt(from)) }
        viewModelScope.launch {
            val error = repository.reorder(trainer(), routineId, next).exceptionOrNull() ?: return@launch
            local.update { it.copy(gone = it.gone || error.isGone(), notice = error.actionMessage()) }
        }
    }

    fun onOpenHeader() {
        val routine = current()?.routine?.takeIf { uiState.value.canEdit } ?: return
        local.update { it.copy(headerSheet = HeaderSheetState(routine.toHeaderInput())) }
    }

    fun onHeaderChange(change: (RoutineHeaderInput) -> RoutineHeaderInput) =
        local.update { l -> l.copy(headerSheet = l.headerSheet?.let { it.copy(input = change(it.input), errors = emptyMap(), message = null) }) }

    fun onSaveHeader() {
        val sheet = local.value.headerSheet?.takeIf { !it.saving } ?: return
        if (uiState.value.offline) return local.update { it.withNetworkNotice() }
        val routine = current()?.routine ?: return
        val errors = sheet.input.errors()
        if (errors.isNotEmpty()) return local.update { it.copy(headerSheet = sheet.copy(errors = errors)) }
        val patch = headerPatch(routine, sheet.input) ?: return local.update { it.copy(headerSheet = null) }
        local.update { it.copy(headerSheet = sheet.copy(saving = true)) }
        viewModelScope.launch {
            val error = repository.update(trainer(), routineId, patch).exceptionOrNull()
            local.update { l ->
                if (error == null) l.copy(headerSheet = null)
                else l.copy(gone = l.gone || error.isGone(), headerSheet = sheet.copy(errors = error.headerErrors(), message = error.actionMessage()))
            }
        }
    }

    fun onOpenExercise(routineExerciseId: String) {
        val e = current()?.exercises?.firstOrNull { it.id == routineExerciseId }?.takeIf { uiState.value.canEdit } ?: return
        local.update { it.copy(exerciseSheet = ExerciseSheetState(e.id, e.name, e.toInput(), removable = true)) }
    }

    fun onExerciseChange(change: (ExerciseInput) -> ExerciseInput) =
        local.update { l -> l.copy(exerciseSheet = l.exerciseSheet?.let { it.copy(input = change(it.input), errors = emptyMap(), message = null) }) }

    fun onSaveExercise() {
        val sheet = local.value.exerciseSheet?.takeIf { !it.saving } ?: return
        if (uiState.value.offline) return local.update { it.withNetworkNotice() }
        val values = when (val r = sheet.input.validate()) {
            is ExerciseFormResult.Invalid -> return local.update { it.copy(exerciseSheet = sheet.copy(errors = r.errors)) }
            is ExerciseFormResult.Valid -> r.values
        }
        val adding = local.value.adding
        val before = current()?.exercises?.firstOrNull { it.id == sheet.key }
        if (adding == null && before == null) return local.update { it.copy(exerciseSheet = null) }
        local.update { it.copy(exerciseSheet = sheet.copy(saving = true)) }
        viewModelScope.launch {
            val t = trainer()
            val result = if (adding != null) {
                repository.addExercises(t, routineId, listOf(NewRoutineExercise(adding.id, adding.name, adding.muscleGroup, values)))
            } else {
                exercisePatch(before!!, values)?.let { repository.updateExercise(t, routineId, sheet.key, it) } ?: Result.success(Unit)
            }
            val error = result.exceptionOrNull()
            local.update { l ->
                if (error == null) l.copy(exerciseSheet = null, adding = null, picking = false)
                else l.copy(gone = l.gone || error.isGone(), exerciseSheet = sheet.copy(errors = error.exerciseErrors(), message = error.actionMessage()))
            }
        }
    }

    fun onRemoveExercise() {
        val sheet = local.value.exerciseSheet?.takeIf { !it.saving && it.removable } ?: return
        if (uiState.value.offline) return local.update { it.withNetworkNotice() }
        local.update { it.copy(exerciseSheet = sheet.copy(saving = true)) }
        viewModelScope.launch {
            val error = repository.removeExercise(trainer(), routineId, sheet.key).exceptionOrNull()
            local.update { l ->
                if (error == null) l.copy(exerciseSheet = null)
                else l.copy(gone = l.gone || error.isGone(), exerciseSheet = sheet.copy(message = error.actionMessage()))
            }
        }
    }

    fun onDismissSheet() = local.update { if (it.exerciseSheet?.saving == true || it.headerSheet?.saving == true) it else it.copy(exerciseSheet = null, headerSheet = null, adding = null) }

    fun onAdd() {
        if (!uiState.value.canEdit) return
        picker.refresh()
        local.update { it.copy(picking = true) }
    }

    fun onPick(exercise: TrainerExercise) = local.update {
        it.copy(adding = exercise, exerciseSheet = ExerciseSheetState("add:${exercise.id}", exercise.name, ExerciseInput()))
    }

    fun onClosePicker() {
        picker.reset()
        local.update { it.copy(picking = false, adding = null, exerciseSheet = null) }
    }

    fun onQuery(text: String) = picker.onQuery(text)
    fun onGroup(group: String?) = picker.onGroup(group)
    fun dismissNotice() = local.update { it.copy(notice = null) }

    /** Una acción sin hoja (activar/desactivar): busy mientras viaja y aviso si falla. */
    private fun act(block: suspend (String) -> Result<Unit>) {
        if (!uiState.value.canEdit) return
        local.update { it.copy(busy = true, notice = null) }
        viewModelScope.launch {
            val error = block(trainer()).exceptionOrNull()
            local.update { l -> l.copy(busy = false, gone = l.gone || error?.isGone() == true, notice = error?.actionMessage()) }
        }
    }
}
