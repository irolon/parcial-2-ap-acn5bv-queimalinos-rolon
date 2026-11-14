package com.fittrainer.ui.gamification

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.gamification.GamificationRepository
import com.fittrainer.data.gamification.businessDate
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.refresh.RefreshController
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
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

/** Racha, medallas y desafíos (chip de Hoy, bloque de Progreso y pantalla Logros). Lee de Room y refresca como Hoy. */
@HiltViewModel
class GamificationViewModel @Inject constructor(
    repository: GamificationRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val ownerId: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.shareIn(viewModelScope, SharingStarted.Eagerly, replay = 1)
    private val today = MutableStateFlow(businessDate(clock.millis()))
    private val refresher = RefreshController(viewModelScope, online, ownerId, GAMIFICATION_REFRESH_FAILED) { repository.refresh(it) }

    @OptIn(ExperimentalCoroutinesApi::class)
    private val summary = ownerId.filterNotNull().flatMapLatest { repository.observeSummary(it) }

    val uiState: StateFlow<GamificationUiState> =
        combine(summary, today, online, refresher.state) { s, date, isOnline, r ->
            GamificationUiState(contentOf(s, date), isOffline = !isOnline, isRefreshing = r.isRefreshing, notice = r.notice)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), GamificationUiState())

    /** Visible de nuevo: recalcula el día (racha y días que quedan) y refresca. */
    fun onStart() {
        today.value = businessDate(clock.millis())
        refresher.start()
    }

    fun onPullToRefresh() = refresher.pull()

    fun dismissNotice() = refresher.dismissNotice()
}
