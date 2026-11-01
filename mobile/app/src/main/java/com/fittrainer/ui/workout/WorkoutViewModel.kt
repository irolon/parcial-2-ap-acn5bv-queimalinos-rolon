package com.fittrainer.ui.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.SaveOutcome
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.data.workout.WorkoutSummary
import com.fittrainer.data.workout.preload
import com.fittrainer.data.workout.setAt
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.Instant
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Sesión activa. Todo sale de Room (vía [WorkoutRepository]); acá solo vive lo que el alumno está
 * ajustando de la serie en pantalla y el cierre en curso. Ninguna acción usa la red.
 */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class WorkoutViewModel @Inject constructor(
    private val repository: WorkoutRepository,
    libraryRepository: LibraryRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val ownerId: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val observed = ownerId.filterNotNull().flatMapLatest { repository.observeActive(it) }
    private val active: StateFlow<Workout?> = observed.stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val library = ownerId.filterNotNull().flatMapLatest { libraryRepository.observeCache(it) }
    private val local = MutableStateFlow(WorkoutLocal())

    val uiState: StateFlow<WorkoutUiState> =
        combine(active, local, connectivity.isOnline, library) { w, l, online, lib ->
            WorkoutUiState(l.loaded, w, l.load, l.editingSet, l.ending, l.summary, l.error, !online, lib)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), WorkoutUiState())

    init {
        viewModelScope.launch {
            ownerId.filterNotNull().collect { owner ->
                // Si la app estuvo cerrada más que el descanso, al abrir se vuelve directo a la serie.
                repository.endRestIfOver(owner)
            }
        }
        viewModelScope.launch {
            val editing = local.map { it.editingSet }.distinctUntilChanged()
            // observed, no active: el null inicial de active no es una respuesta de Room (loaded sería prematuro).
            combine(observed, editing) { w, e -> w to e }.collect { (w, e) ->
                refreshLoad(w, e)
            }
        }
    }

    /** Precarga cuando cambia la serie en pantalla (o el ejercicio, por un reemplazo). */
    private suspend fun refreshLoad(w: Workout?, editing: Int?) {
        if (w == null) {
            local.update { it.copy(loaded = true) }
            return
        }
        val setNumber = editing ?: w.cursor.setNumber
        val key = w.loadKey(setNumber)
        if (local.value.loadKey == key && local.value.loaded) return
        // Si falla leer el historial se precarga con el plan: la loadKey se actualiza igual y el botón responde.
        val last = try {
            repository.lastSetFor(w.ownerId, key.exerciseId)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }
        val load = w.preload(Cursor(w.cursor.position, setNumber), last).inRange()
        local.update { it.copy(loaded = true, loadKey = key, load = load) }
    }

    fun now(): Instant = clock.instant()

    fun onAdjustKg(delta: Double) = local.update { it.copy(load = it.load.copy(kg = it.load.kg + delta).inRange()) }

    fun onManualEntry(kg: Double, reps: Int) = local.update { it.copy(load = Load(kg, reps).inRange()) }

    /** Solo se elige una serie ya hecha (para corregirla) o la del cursor (para volver). */
    fun onSelectSet(setNumber: Int) {
        val w = active.value ?: return
        val editing = setNumber.takeIf { it != w.cursor.setNumber && w.setAt(w.cursor.position, it) != null }
        local.update { it.copy(editingSet = editing) }
    }

    fun onSelectExercise(position: Int) = write { owner ->
        local.update { it.copy(editingSet = null) }
        repository.moveTo(owner, position)
    }

    /**
     * Se ignora con un guardado en vuelo, si la precarga en pantalla no es de esta serie (todavía no llegó
     * la de la serie nueva) o si es el segundo toque de un doble toque.
     */
    fun onConfirm() {
        val w = active.value ?: return
        val l = local.value
        val setNumber = l.editingSet ?: w.cursor.setNumber
        if (ownerId.value == null || l.saving || l.loadKey != w.loadKey(setNumber)) return
        if (w.isDoubleTap(setNumber, clock.instant())) return
        local.update { it.copy(saving = true) }
        write { owner ->
            try {
                when (repository.saveSet(owner, w.cursor.position, setNumber, l.load)) {
                    SaveOutcome.Corrected -> local.update { it.copy(editingSet = null) }
                    SaveOutcome.AllDone -> finish(owner)
                    SaveOutcome.Advanced, null -> Unit
                }
            } finally {
                local.update { it.copy(saving = false) }
            }
        }
    }

    /** Cambia el descanso del ejercicio en pantalla para esta sesión (no el que ya está corriendo). */
    fun onPlannedRestAdjust(deltaSeconds: Int) {
        val position = active.value?.cursor?.position ?: return
        write(REST_SAVE_FAILED) { repository.adjustPlannedRest(it, position, deltaSeconds) }
    }

    fun onRestAdjust(deltaSeconds: Int) = write(REST_SAVE_FAILED) { repository.adjustRest(it, deltaSeconds) }

    fun onRestTogglePause() = write(REST_SAVE_FAILED) { repository.toggleRestPause(it) }

    fun onRestSkip() = write(REST_SAVE_FAILED) { repository.skipRest(it) }

    /**
     * La pantalla vio el descanso en 0. Si el service ya lo cerró, no hace nada. Sin aviso si falla: lo
     * dispara la pantalla sola en cada tick y el alumno no tocó nada (reintenta solo con el próximo).
     */
    fun onRestElapsed() = write(null) { repository.endRestIfOver(it) }

    fun onReplace(exercise: LibraryExercise) {
        val position = active.value?.cursor?.position ?: return
        write { repository.replaceExercise(it, position, exercise) }
    }

    fun onFinish() = write { finish(it) }

    fun onDiscard() = write { repository.discard(it) }

    fun dismissError() = local.update { it.copy(error = null) }

    /** ending antes de terminar: la sesión deja de estar abierta antes de que llegue el resumen. */
    private suspend fun finish(owner: String) {
        local.update { it.copy(ending = true) }
        try {
            val summary = repository.finish(owner)
            local.update { it.copy(summary = summary, ending = summary != null) }
        } catch (e: Exception) {
            local.update { it.copy(ending = false) }
            throw e
        }
    }

    /**
     * Si Room falla, avisa con [errorMessage] (null: en silencio) y no cambia nada: la serie o el descanso
     * siguen en pantalla para reintentar.
     */
    private fun write(errorMessage: String? = SAVE_FAILED, block: suspend (String) -> Unit) {
        val owner = ownerId.value ?: return
        viewModelScope.launch {
            try {
                block(owner)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (errorMessage != null) local.update { it.copy(error = errorMessage) }
            }
        }
    }
}
