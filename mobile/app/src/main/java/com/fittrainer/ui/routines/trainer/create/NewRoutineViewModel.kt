package com.fittrainer.ui.routines.trainer.create

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.api.routines.CreateRoutineRequest
import com.fittrainer.data.exercises.trainer.TrainerExercise
import com.fittrainer.data.exercises.trainer.TrainerExercisesRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.routines.trainer.ExerciseFormResult
import com.fittrainer.data.routines.trainer.ExerciseInput
import com.fittrainer.data.routines.trainer.NewRoutineExercise
import com.fittrainer.data.routines.trainer.RoutineHeaderInput
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.routines.trainer.errors
import com.fittrainer.data.routines.trainer.orderedDays
import com.fittrainer.data.routines.trainer.deactivateOthers
import com.fittrainer.data.routines.trainer.toInput
import com.fittrainer.data.routines.trainer.toRequestItems
import com.fittrainer.data.routines.trainer.validate
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.routines.trainer.components.ExerciseSheetState
import com.fittrainer.ui.routines.trainer.picker.CatalogPicker
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
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
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Asistente "Rutina nueva" (E8). Los ejercicios se arman en memoria y "Crear" hace un solo POST. */
@HiltViewModel
class NewRoutineViewModel @Inject constructor(
    private val repository: TrainerRoutinesRepository,
    exercises: TrainerExercisesRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    saved: SavedStateHandle,
) : ViewModel() {

    private val studentId: String = checkNotNull(saved[STUDENT_ID_ARG])
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val local = MutableStateFlow(NewRoutineLocal())
    private val picker = CatalogPicker(exercises, viewModelScope, trainerId)

    @OptIn(ExperimentalCoroutinesApi::class)
    private val active = trainerId.filterNotNull().flatMapLatest { repository.observeStudentRoutines(it, studentId) }
        // null = todavía no se sabe cuáles tiene activas (la lista nunca se bajó): no se puede crear.
        .map { cache -> cache?.routines?.filter { it.active } }

    val uiState: StateFlow<NewRoutineUiState> = combine(local, active, connectivity.isOnline, picker.state) { l, a, online, p ->
        NewRoutineUiState(
            step = l.step, header = l.header, headerErrors = l.headerErrors, activeRoutines = a.orEmpty(), previousKnown = a != null,
            deactivateCurrent = l.deactivateCurrent, items = l.items, exerciseSheet = l.exerciseSheet, picking = l.picking,
            picker = p, creating = l.creating, offline = !online, notice = l.notice, done = l.done,
        )
    }.stateIn(viewModelScope, SharingStarted.Eagerly, NewRoutineUiState())

    private suspend fun trainer() = trainerId.filterNotNull().first()

    init {
        refreshPrevious()
    }

    private fun refreshPrevious() {
        viewModelScope.launch { repository.refreshList(trainer(), studentId) }
    }

    fun onHeaderChange(change: (RoutineHeaderInput) -> RoutineHeaderInput) =
        local.update { it.copy(header = change(it.header), headerErrors = emptyMap()) }

    fun onToggleDeactivate(on: Boolean) = local.update { it.copy(deactivateCurrent = on) }

    fun onNext() {
        val errors = local.value.header.errors()
        local.update { if (errors.isEmpty()) it.copy(step = 2) else it.copy(headerErrors = errors) }
    }

    fun onBackStep() = local.update { it.copy(step = 1) }

    fun onAdd() {
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

    /** La hoja de un ejercicio ya agregado: la clave es su posición en la lista. */
    fun onOpenExercise(index: Int) {
        val item = local.value.items.getOrNull(index) ?: return
        local.update { it.copy(exerciseSheet = ExerciseSheetState("$index", item.name, item.values.toInput(), removable = true)) }
    }

    fun onExerciseChange(change: (ExerciseInput) -> ExerciseInput) =
        local.update { l -> l.copy(exerciseSheet = l.exerciseSheet?.let { it.copy(input = change(it.input), errors = emptyMap()) }) }

    fun onSaveExercise() {
        val l = local.value
        val sheet = l.exerciseSheet ?: return
        val values = when (val r = sheet.input.validate()) {
            is ExerciseFormResult.Invalid -> return local.update { it.copy(exerciseSheet = sheet.copy(errors = r.errors)) }
            is ExerciseFormResult.Valid -> r.values
        }
        val adding = l.adding
        val items = if (adding != null) {
            l.items + NewRoutineExercise(adding.id, adding.name, adding.muscleGroup, values)
        } else {
            val index = sheet.key.toIntOrNull() ?: return
            l.items.mapIndexed { i, item -> if (i == index) item.copy(values = values) else item }
        }
        if (adding != null) picker.reset()
        local.update { it.copy(items = items, exerciseSheet = null, adding = null, picking = false, notice = null) }
    }

    fun onRemoveExercise() {
        val index = local.value.exerciseSheet?.key?.toIntOrNull() ?: return
        local.update { l -> l.copy(items = l.items.filterIndexed { i, _ -> i != index }, exerciseSheet = null) }
    }

    fun onDismissSheet() = local.update { it.copy(exerciseSheet = null, adding = null) }

    fun onMove(index: Int, up: Boolean) = local.update { l ->
        val to = if (up) index - 1 else index + 1
        if (index !in l.items.indices || to !in l.items.indices) l
        else l.copy(items = l.items.toMutableList().apply { add(to, removeAt(index)) })
    }

    /**
     * Un solo POST (un doble toque no crea dos, tampoco después de crear). Si "Desactivar la rutina actual" está marcado, después
     * desactiva cada una de las que estaban activas; si alguna falla, la nueva queda igual y se avisa.
     */
    fun onCreate() {
        val l = local.value
        val state = uiState.value
        // Ya creada (done) tampoco: un toque entre el POST y la navegación crearía otra.
        if (l.creating || l.done != null || state.offline) return
        if (l.items.isEmpty()) return local.update { it.copy(notice = NEW_ROUTINE_NO_EXERCISES) }
        // Sin saber cuáles tiene activas no se crea: "Desactivar la rutina actual" no desactivaría nada.
        if (!state.previousKnown) return local.update { it.copy(notice = PREVIOUS_UNKNOWN) }.also { refreshPrevious() }
        val previous = if (l.deactivateCurrent) state.activeRoutines else emptyList()
        local.update { it.copy(creating = true, notice = null) }
        viewModelScope.launch {
            val t = trainer()
            val request = CreateRoutineRequest(studentId, l.header.name.trim(), l.header.goal.orEmpty(), l.header.orderedDays(), l.items.toRequestItems())
            val id = repository.create(t, request).getOrElse {
                return@launch local.update { it.copy(creating = false, notice = CREATE_FAILED) }
            }
            val failed = repository.deactivateOthers(t, previous, keepId = id)
            repository.refreshList(t, studentId)
            local.update { it.copy(creating = false, done = NewRoutineDone(id, failed.takeIf { f -> f.isNotEmpty() }?.let(::deactivateFailed))) }
        }
    }

    fun dismissNotice() = local.update { it.copy(notice = null) }
}
