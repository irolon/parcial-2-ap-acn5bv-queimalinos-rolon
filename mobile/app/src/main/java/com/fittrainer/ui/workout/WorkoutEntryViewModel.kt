package com.fittrainer.ui.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutLaunchRequests
import com.fittrainer.data.workout.WorkoutRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Entrada a la sesión desde Hoy, el detalle de una rutina, la notificación y el aviso del logout con sesión abierta. */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class WorkoutEntryViewModel @Inject constructor(
    private val repository: WorkoutRepository,
    sessionRepository: SessionRepository,
    private val launches: WorkoutLaunchRequests,
) : ViewModel() {

    private val ownerId: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    /** La sesión abierta, de la rutina que sea: Hoy la compara con la rutina del día. */
    val active: StateFlow<Workout?> = ownerId.filterNotNull()
        .flatMapLatest { repository.observeActive(it) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val hasActive: StateFlow<Boolean> = active
        .map { it != null }
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    val openRequests: StateFlow<Boolean> = launches.pending

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun dismissError() { _error.value = null }

    /** "Empezar" desde Hoy o el detalle: se guarda en Room antes de navegar (si ya hay una abierta, el repo devuelve esa). */
    fun start(routine: Routine, onReady: () -> Unit) {
        val owner = ownerId.value ?: return
        attempt(START_FAILED) {
            repository.start(owner, routine)
            onReady()
        }
    }

    /** Logout con sesión abierta: se termina (sin series, se descarta) y recién después se sale. */
    fun finishActive(onDone: () -> Unit) {
        val owner = ownerId.value ?: return onDone()
        attempt(FINISH_FAILED) {
            repository.finish(owner)
            onDone()
        }
    }

    /** Si Room falla no se navega ni se cierra la cuenta: queda el aviso para reintentar (un intento bueno lo borra). */
    private fun attempt(failure: String, block: suspend () -> Unit) {
        viewModelScope.launch {
            try {
                block()
                _error.value = null
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _error.value = failure
            }
        }
    }

    /** Espera al dueño y a la primera respuesta de Room: `hasActive.value` arranca en false tras recrear. */
    suspend fun hasActiveNow(): Boolean =
        repository.observeActive(ownerId.filterNotNull().first()).first() != null

    /** Solo para el rol alumno (el entrenador nunca tiene dueño de sesión). */
    fun requestSignOut(onNoActive: () -> Unit, onActive: () -> Unit) {
        viewModelScope.launch { if (hasActiveNow()) onActive() else onNoActive() }
    }

    fun consumeOpenRequest() = launches.consume()
}
