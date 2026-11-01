package com.fittrainer.ui.templates.trainer.list

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.students.TrainerStudentsRepository
import com.fittrainer.data.templates.trainer.TemplateSummary
import com.fittrainer.data.templates.trainer.TemplatesCache
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import com.fittrainer.ui.templates.trainer.TEMPLATES_REFRESH_FAILED
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** studentName: en el modo "para un alumno" (desde la ficha), su nombre para el título. */
data class TemplatesUiState(
    val loaded: Boolean = false,
    val everSynced: Boolean = false,
    val templates: List<TemplateSummary> = emptyList(),
    val offline: Boolean = false,
    val loadError: String? = null,
    val studentId: String? = null,
    val studentName: String? = null,
)

/** Lista de plantillas (E9), desde Más o desde la ficha de un alumno ([STUDENT_ID_ARG] opcional). */
@HiltViewModel
class TemplatesViewModel @Inject constructor(
    private val repository: TrainerTemplatesRepository,
    students: TrainerStudentsRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    saved: SavedStateHandle,
) : ViewModel() {

    private val studentId: String? = saved[STUDENT_ID_ARG]
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val loadError = MutableStateFlow<String?>(null)
    private var refreshing = false

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache: Flow<Pair<Boolean, TemplatesCache?>> = trainerId.filterNotNull()
        .flatMapLatest { repository.observeList(it) }
        .map<TemplatesCache?, Pair<Boolean, TemplatesCache?>> { true to it }
        .onStart { emit(false to null) }

    @OptIn(ExperimentalCoroutinesApi::class)
    private val studentName: Flow<String?> = if (studentId == null) flowOf(null) else trainerId.filterNotNull()
        .flatMapLatest { students.observe(it) }
        .map { cache -> cache.students.firstOrNull { it.id == studentId }?.name }
        .onStart { emit(null) }

    val uiState: StateFlow<TemplatesUiState> = combine(cache, connectivity.isOnline, loadError, studentName) { c, online, error, name ->
        TemplatesUiState(
            loaded = c.first, everSynced = c.second != null, templates = c.second?.templates.orEmpty(),
            offline = !online, loadError = error, studentId = studentId, studentName = name,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), TemplatesUiState(studentId = studentId))

    fun onStart() = refresh()
    fun onRetry() = refresh()

    private fun refresh() {
        if (refreshing) return
        refreshing = true
        loadError.value = null
        viewModelScope.launch {
            val error = repository.refreshList(trainerId.filterNotNull().first()).exceptionOrNull()
            val offline = (error as? DataException)?.error == DataError.Offline
            loadError.value = if (error != null && !offline) TEMPLATES_REFRESH_FAILED else null
            refreshing = false
        }
    }
}
