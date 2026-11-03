package com.fittrainer.ui.routines.trainer.section

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.routines.trainer.StudentRoutinesCache
import com.fittrainer.data.routines.trainer.TrainerRoutineSummary
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.routines.trainer.ROUTINES_REFRESH_FAILED
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
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** loaded: ya se leyó Room. everSynced: la lista se bajó alguna vez (si no, no se puede decir "Sin rutinas"). */
data class RoutinesSectionUiState(
    val loaded: Boolean = false,
    val everSynced: Boolean = false,
    val routines: List<TrainerRoutineSummary> = emptyList(),
    val offline: Boolean = false,
    val loadError: String? = null,
)

/** Sección "Rutinas" de la ficha (E8): todas las rutinas del alumno, de Room. Refresca cada vez que la ficha vuelve. */
@HiltViewModel
class RoutinesSectionViewModel @Inject constructor(
    private val repository: TrainerRoutinesRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    saved: SavedStateHandle,
) : ViewModel() {

    private val studentId: String = checkNotNull(saved[STUDENT_ID_ARG])
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val loadError = MutableStateFlow<String?>(null)
    private var refreshing = false

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = trainerId.filterNotNull()
        .flatMapLatest { repository.observeStudentRoutines(it, studentId) }
        .map<StudentRoutinesCache?, Loaded> { Loaded(it) }
        .onStart { emit(Loaded(null, read = false)) }

    val uiState: StateFlow<RoutinesSectionUiState> = combine(cache, connectivity.isOnline, loadError) { c, online, error ->
        RoutinesSectionUiState(
            loaded = c.read,
            everSynced = c.value != null,
            routines = c.value?.routines.orEmpty(),
            offline = !online,
            loadError = error,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), RoutinesSectionUiState())

    /** Al volver a la ficha (por ejemplo, después de editar o crear una rutina). */
    fun onStart() = refresh()

    fun onRetry() = refresh()

    private fun refresh() {
        if (refreshing) return
        refreshing = true
        loadError.value = null
        viewModelScope.launch {
            val error = repository.refreshList(trainerId.filterNotNull().first(), studentId).exceptionOrNull()
            val offline = (error as? DataException)?.error == DataError.Offline
            loadError.update { if (error != null && !offline) ROUTINES_REFRESH_FAILED else null }
            refreshing = false
        }
    }

    private data class Loaded(val value: StudentRoutinesCache?, val read: Boolean = true)
}
