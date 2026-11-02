package com.fittrainer.ui.routines

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.refresh.RefreshController
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.LocalDate
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.shareIn
import kotlinx.coroutines.flow.stateIn

/** Mis rutinas: lee de Room y refresca como Hoy (el repositorio junta los pedidos de las dos pestañas). */
@HiltViewModel
class RoutinesViewModel @Inject constructor(
    repository: RoutineRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val ownerId: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.shareIn(viewModelScope, SharingStarted.Eagerly, replay = 1)
    private val today = MutableStateFlow(LocalDate.now(clock))
    private val refresher = RefreshController(viewModelScope, online, ownerId, ROUTINES_REFRESH_FAILED, repository::refresh)

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = ownerId.filterNotNull().flatMapLatest { repository.observeCache(it) }

    val uiState: StateFlow<RoutinesUiState> =
        combine(cache, today, online, refresher.state) { c, date, isOnline, r ->
            RoutinesUiState(routinesContent(c, date), isOffline = !isOnline, isRefreshing = r.isRefreshing, notice = r.notice)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), RoutinesUiState())

    /** Visible de nuevo: recalcula el día (para la marca "Hoy") y refresca. */
    fun onStart() {
        today.value = LocalDate.now(clock)
        refresher.start()
    }

    fun onPullToRefresh() = refresher.pull()

    fun dismissNotice() = refresher.dismissNotice()
}
