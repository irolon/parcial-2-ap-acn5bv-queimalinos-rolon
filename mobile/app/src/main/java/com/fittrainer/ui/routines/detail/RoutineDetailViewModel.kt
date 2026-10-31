package com.fittrainer.ui.routines.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.ui.workout.START_FAILED
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

const val ROUTINE_ID_ARG = "routineId"

/** Mis rutinas → una rutina. Solo lee Room: el refresco lo hace la lista (y Hoy). */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class RoutineDetailViewModel @Inject constructor(
    handle: SavedStateHandle,
    routines: RoutineRepository,
    private val workouts: WorkoutRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
) : ViewModel() {

    private val routineId: String = checkNotNull(handle[ROUTINE_ID_ARG])
    private val ownerId: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val error = MutableStateFlow<String?>(null)

    val uiState: StateFlow<RoutineDetailUiState> = ownerId.filterNotNull()
        .flatMapLatest { owner ->
            combine(routines.observeCache(owner), workouts.observeActive(owner), connectivity.isOnline, error) { c, active, online, err ->
                RoutineDetailUiState(detailContent(c, routineId, active), isOffline = !online, error = err)
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), RoutineDetailUiState())

    /** "Empezar": la sesión queda guardada en Room antes de navegar. Si Room falla, aviso y no se navega. */
    fun start(onReady: () -> Unit) {
        val owner = ownerId.value ?: return
        val routine = (uiState.value.content as? RoutineDetailContent.Loaded)?.routine ?: return
        viewModelScope.launch {
            try {
                workouts.start(owner, routine)
                error.value = null
                onReady()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                error.value = START_FAILED
            }
        }
    }

    fun dismissError() { error.value = null }
}
