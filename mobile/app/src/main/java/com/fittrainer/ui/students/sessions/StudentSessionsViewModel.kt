package com.fittrainer.ui.students.sessions

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.students.sessions.SessionsCache
import com.fittrainer.data.students.sessions.StudentSessionsRepository
import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
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

/** items: la lista de Room (página 1 y lo traído con "Ver más"), sin repetidos. */
data class StudentSessionsUiState(
    val loaded: Boolean = false,
    val everSynced: Boolean = false,
    val items: List<HistoryItem> = emptyList(),
    val hasMore: Boolean = false,
    val loadingMore: Boolean = false,
    val refreshing: Boolean = false,
    val offline: Boolean = false,
    val notice: String? = null,
    /** El último refresh falló por algo que no es la red (la red ya la avisa el indicador): se ofrece reintentar. */
    val loadError: String? = null,
)

/**
 * Sesiones de un alumno (sección de la ficha y lista completa). Todo sale de Room; refresca al entrar, salvo
 * que el último refresh OK sea de hace menos de 5 min o que se haya traído más con "Ver más": refrescar deja
 * solo la página 1, y volver de un detalle no tiene que cortar la lista (revisión de la #55).
 */
@HiltViewModel
class StudentSessionsViewModel @Inject constructor(
    private val repository: StudentSessionsRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    saved: SavedStateHandle,
    private val clock: Clock,
) : ViewModel() {

    private val studentId: String = checkNotNull(saved[STUDENT_ID_ARG])
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val local = MutableStateFlow(Local())
    private var lastRefreshOkAt: Long? = null
    private var pagedSinceRefresh = false

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = trainerId.filterNotNull()
        .flatMapLatest { repository.observeLatest(it, studentId) }
        .map<SessionsCache, SessionsCache?> { it }
        .onStart { emit(null) }

    val uiState: StateFlow<StudentSessionsUiState> = combine(cache, connectivity.isOnline, local) { c, online, l ->
        StudentSessionsUiState(
            loaded = c != null,
            everSynced = c?.fetchedAt != null,
            items = c?.items.orEmpty().distinctBy { it.id },
            hasMore = c?.hasMore ?: false,
            loadingMore = l.loadingMore,
            refreshing = l.refreshing,
            offline = !online,
            notice = l.notice,
            loadError = l.loadError,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), StudentSessionsUiState())

    /** Al entrar o al volver a la pantalla (también al reaparecer la sección al scrollear la ficha). */
    fun onStart() {
        val last = lastRefreshOkAt
        if (pagedSinceRefresh || (last != null && clock.millis() - last < FRESH_MS)) return
        refresh()
    }

    /** Reintentar siempre baja de nuevo. */
    fun onRetry() = refresh()

    /** Si el refresh falla, Room queda como estaba (con las páginas ya traídas). */
    private fun refresh() {
        if (local.value.refreshing) return
        local.update { it.copy(refreshing = true, loadError = null) }
        viewModelScope.launch {
            val trainer = trainerId.filterNotNull().first()
            val error = repository.refreshLatest(trainer, studentId).exceptionOrNull()
            if (error == null) {
                lastRefreshOkAt = clock.millis()
                pagedSinceRefresh = false
            }
            val offline = (error as? DataException)?.error == DataError.Offline
            local.update { it.copy(refreshing = false, loadError = if (error != null && !offline) SESSIONS_REFRESH_FAILED else null) }
        }
    }

    /** Sin red avisa y deja la lista como está. */
    fun onLoadMore() {
        if (local.value.loadingMore) return
        local.update { it.copy(loadingMore = true, notice = null) }
        viewModelScope.launch {
            val failed = repository.loadMore(trainerId.filterNotNull().first(), studentId).isFailure
            if (!failed) pagedSinceRefresh = true
            local.update { it.copy(loadingMore = false, notice = if (failed) LOAD_MORE_FAILED else null) }
        }
    }

    fun dismissNotice() = local.update { it.copy(notice = null) }

    private companion object {
        const val FRESH_MS = 5 * 60_000L
    }

    private data class Local(
        val refreshing: Boolean = false,
        val loadingMore: Boolean = false,
        val notice: String? = null,
        val loadError: String? = null,
    )
}
