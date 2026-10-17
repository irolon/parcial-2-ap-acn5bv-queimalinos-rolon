package com.fittrainer.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.library.LibraryCache
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
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
 * Biblioteca. Lee siempre de Room (vía el repositorio) y refresca al quedar visible y con
 * pull-to-refresh, nunca dos pedidos a la vez. El filtro por grupo es en memoria: anda offline.
 */
@HiltViewModel
class LibraryViewModel @Inject constructor(
    private val repository: LibraryRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
) : ViewModel() {

    private val student: StateFlow<AuthUser?> = sessionRepository.session
        .map { (it as? Session.Student)?.user }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.shareIn(viewModelScope, SharingStarted.Eagerly, replay = 1)
    private val selectedGroup = MutableStateFlow<String?>(null)
    private val refreshState = MutableStateFlow(RefreshState())
    private var refreshJob: Job? = null
    private var manualRequested = false

    // null hasta que Room responde la primera vez.
    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache: Flow<LibraryCache?> = student.filterNotNull()
        .flatMapLatest { repository.observeCache(it.id) }
        .map<LibraryCache, LibraryCache?> { it }
        .onStart { emit(null) }

    val uiState: StateFlow<LibraryUiState> =
        combine(cache, selectedGroup, online, refreshState) { c, group, online, r ->
            libraryUiState(c, group, online, r.isRefreshing, r.notice)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), LibraryUiState())

    init {
        // drop(1): el estado al suscribirse no es un cambio.
        viewModelScope.launch {
            // Volvió la red: lo que estaba en vuelo salió por la red vieja (muerta). Se cancela y se arranca otro.
            online.drop(1).collect { if (it) refresh(manual = false, restart = true) }
        }
    }

    /** La pantalla quedó visible (al entrar a la pestaña o al volver la app al frente). */
    fun onStart() = refresh(manual = false)

    fun onPullToRefresh() = refresh(manual = true)

    /** null = "Todos". */
    fun onSelectGroup(group: String?) {
        selectedGroup.value = group
    }

    fun dismissNotice() = refreshState.update { it.copy(notice = null) }

    /**
     * Si ya hay un pedido en vuelo, un pull solo lo marca como manual (para que avise si falla).
     * Con restart (volvió la red) se cancela el pedido viejo y se arranca otro, conservando lo manual.
     */
    private fun refresh(manual: Boolean, restart: Boolean = false) {
        if (refreshJob?.isActive == true) {
            if (!restart) {
                if (manual) manualRequested = true
                return
            }
            refreshJob?.cancel()
            manualRequested = manual || manualRequested
        } else {
            manualRequested = manual
        }
        refreshJob = viewModelScope.launch {
            val user = student.filterNotNull().first()
            refreshState.value = RefreshState(isRefreshing = true)
            val result = repository.refresh(user.id)
            // Solo el refresco manual avisa si falla; el automático muestra lo que hay sin alarmar.
            refreshState.value = RefreshState(notice = if (manualRequested && result.isFailure) LIBRARY_REFRESH_FAILED else null)
        }
    }

    private data class RefreshState(val isRefreshing: Boolean = false, val notice: String? = null)
}
