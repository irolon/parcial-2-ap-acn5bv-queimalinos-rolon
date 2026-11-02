package com.fittrainer.ui.students

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.data.students.StudentFilter
import com.fittrainer.data.students.StudentsCache
import com.fittrainer.data.students.TrainerStudentsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.LocalDate
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.shareIn
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Lista de alumnos del entrenador. Lee siempre de Room (vía el repositorio) y refresca al quedar
 * visible, con pull-to-refresh y al volver la red, nunca dos pedidos a la vez. Filtro y búsqueda son
 * en memoria: andan offline.
 */
@HiltViewModel
class StudentsViewModel @Inject constructor(
    private val repository: TrainerStudentsRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val trainer: StateFlow<AuthUser?> = sessionRepository.session
        .map { (it as? Session.Trainer)?.user }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.shareIn(viewModelScope, SharingStarted.Eagerly, replay = 1)
    private val filters = MutableStateFlow(Filters())
    private val refreshState = MutableStateFlow(RefreshState())
    private var refreshJob: Job? = null

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache: Flow<StudentsCache?> = trainer.filterNotNull()
        .flatMapLatest { repository.observe(it.id) }
        .map<StudentsCache, StudentsCache?> { it }
        .onStart { emit(null) }

    val uiState: StateFlow<StudentsUiState> =
        combine(cache, filters, online, refreshState) { c, f, isOnline, r ->
            val now = clock.instant()
            studentsUiState(c, f.filter, f.query, LocalDate.ofInstant(now, ARGENTINA), now, isOnline, r.refreshing, r.error)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), StudentsUiState())

    init {
        // drop(1): el estado al suscribirse no es un cambio. Volvió la red: se reintenta.
        viewModelScope.launch { online.drop(1).collect { if (it) refresh(restart = true) } }
    }

    /** La pantalla quedó visible (al entrar a la pestaña o al volver la app al frente). */
    fun onStart() = refresh()

    fun onPullToRefresh() = refresh()

    fun onRetry() = refresh()

    fun onFilter(filter: StudentFilter) = filters.update { it.copy(filter = filter) }

    fun onQuery(query: String) = filters.update { it.copy(query = query) }

    fun dismissError() = refreshState.update { it.copy(error = null) }

    private fun refresh(restart: Boolean = false) {
        if (refreshJob?.isActive == true) {
            if (!restart) return
            refreshJob?.cancel()
        }
        refreshJob = viewModelScope.launch {
            val user = trainer.filterNotNull().first()
            refreshState.value = RefreshState(refreshing = true)
            val error = repository.refresh(user.id).exceptionOrNull()
            refreshState.value = RefreshState(error = error?.let(::errorText))
        }
    }

    private fun errorText(e: Throwable): String =
        if ((e as? DataException)?.error == DataError.Offline) STUDENTS_OFFLINE_ERROR else STUDENTS_REFRESH_FAILED

    private data class Filters(val filter: StudentFilter = StudentFilter.ALL, val query: String = "")

    private data class RefreshState(val refreshing: Boolean = false, val error: String? = null)
}
