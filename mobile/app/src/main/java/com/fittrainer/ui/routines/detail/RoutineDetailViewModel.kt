package com.fittrainer.ui.routines.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.WorkoutRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

const val ROUTINE_ID_ARG = "routineId"

/**
 * Mis rutinas → una rutina. Solo lee Room: el refresco lo hace la lista (y Hoy). "Empezar" no vive acá:
 * lo hace el WorkoutEntryViewModel, la misma entrada que usa Hoy.
 */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class RoutineDetailViewModel @Inject constructor(
    handle: SavedStateHandle,
    routines: RoutineRepository,
    workouts: WorkoutRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
) : ViewModel() {

    private val routineId: String = checkNotNull(handle[ROUTINE_ID_ARG])

    private val ownerId: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val uiState: StateFlow<RoutineDetailUiState> = ownerId.filterNotNull()
        .flatMapLatest { owner ->
            combine(routines.observeCache(owner), workouts.observeActive(owner), connectivity.isOnline) { c, active, online ->
                RoutineDetailUiState(detailContent(c, routineId, active), isOffline = !online)
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), RoutineDetailUiState())
}
