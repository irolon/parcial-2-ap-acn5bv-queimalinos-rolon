package com.fittrainer.ui.today

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.routine.resolveToday
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

/**
 * Pantalla "Hoy". Lee siempre de Room (vía el repositorio) y refresca en segundo plano con [RefreshController]:
 * al quedar visible, al volver la red y con pull-to-refresh.
 */
@HiltViewModel
class TodayViewModel @Inject constructor(
    repository: RoutineRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val student: StateFlow<AuthUser?> = sessionRepository.session
        .map { (it as? Session.Student)?.user }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.shareIn(viewModelScope, SharingStarted.Eagerly, replay = 1)
    private val today = MutableStateFlow(LocalDate.now(clock))
    private val refresher =
        RefreshController(viewModelScope, online, student.map { it?.id }, MANUAL_REFRESH_FAILED, repository::refresh)

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = student.filterNotNull().flatMapLatest { repository.observeCache(it.id) }

    val uiState: StateFlow<TodayUiState> =
        combine(cache, student, today, online, refresher.state) { c, user, date, isOnline, r ->
            TodayUiState(
                content = resolveToday(c.routines, date, everSynced = c.lastSyncedAt != null),
                studentName = user?.name.orEmpty(),
                today = date,
                isOffline = !isOnline,
                lastSyncedAt = c.lastSyncedAt,
                isRefreshing = r.isRefreshing,
                notice = r.notice,
            )
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), TodayUiState(today = LocalDate.now(clock)))

    /** La pantalla quedó visible (al entrar o al volver la app al frente): recalcula el día y refresca. */
    fun onStart() {
        today.value = LocalDate.now(clock)
        refresher.start()
    }

    fun onPullToRefresh() = refresher.pull()

    fun dismissNotice() = refresher.dismissNotice()
}
