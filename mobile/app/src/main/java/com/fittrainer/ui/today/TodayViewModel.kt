package com.fittrainer.ui.today

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.routine.resolveToday
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.LocalDate
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.shareIn
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Pantalla "Hoy". Lee siempre de Room (vía el repositorio) y refresca en segundo plano:
 * al quedar visible, al volver la red y con pull-to-refresh. Nunca dos pedidos a la red a la vez.
 */
@HiltViewModel
class TodayViewModel @Inject constructor(
    private val repository: RoutineRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val student: StateFlow<AuthUser?> = sessionRepository.session
        .map { (it as? Session.Student)?.user }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.shareIn(viewModelScope, SharingStarted.Eagerly, replay = 1)
    private val today = MutableStateFlow(LocalDate.now(clock))
    private val refreshState = MutableStateFlow(RefreshState())
    private var refreshJob: Job? = null
    private var manualRequested = false
    private var waitingToRetry = false

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = student.filterNotNull().flatMapLatest { repository.observeCache(it.id) }

    val uiState: StateFlow<TodayUiState> =
        combine(cache, student, today, online, refreshState) { c, user, date, isOnline, r ->
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

    init {
        // drop(1): el estado al suscribirse no es un cambio.
        viewModelScope.launch {
            online.drop(1).collect { isOnline ->
                when {
                    // Volvió la red: lo que estaba en vuelo salió por la red vieja (muerta). Se cancela y se arranca otro.
                    isOnline -> refresh(manual = false, restart = true)
                    // Se cortó la red mientras se esperaba para reintentar: no tiene sentido seguir.
                    waitingToRetry -> {
                        refreshJob?.cancel()
                        waitingToRetry = false
                    }
                }
            }
        }
    }

    /** La pantalla quedó visible (al entrar o al volver la app al frente): recalcula el día y refresca. */
    fun onStart() {
        today.value = LocalDate.now(clock)
        refresh(manual = false)
    }

    fun onPullToRefresh() = refresh(manual = true)

    fun dismissNotice() = refreshState.update { it.copy(notice = null) }

    /**
     * Nunca dos pedidos a la red a la vez. Si ya hay uno en vuelo, un pull lo marca como manual (para
     * que avise si falla) y no arranca otro. Si solo se está esperando para reintentar, se arranca ya.
     */
    private fun refresh(manual: Boolean, restart: Boolean = false) {
        if (refreshJob?.isActive == true) {
            if (!restart && !waitingToRetry) {
                if (manual) manualRequested = true
                return
            }
            refreshJob?.cancel()
            manualRequested = manual || (restart && manualRequested)
        } else {
            manualRequested = manual
        }
        waitingToRetry = false
        refreshJob = viewModelScope.launch { runRefresh() }
    }

    /** Solo el refresco manual avisa si falla; el automático muestra lo que hay en Room sin alarmar. */
    private suspend fun runRefresh() {
        val user = student.filterNotNull().first()
        refreshState.update { it.copy(isRefreshing = true, notice = null) }
        var result = repository.refresh(user.id)
        for (wait in AUTO_RETRY_DELAYS_MS) {
            if (!shouldRetry(result)) break
            // La red recién vuelta puede no estar lista todavía (DNS, Wi-Fi sin validar): se reintenta.
            refreshState.update { it.copy(isRefreshing = false) }
            waitingToRetry = true
            delay(wait)
            waitingToRetry = false
            refreshState.update { it.copy(isRefreshing = true) }
            result = repository.refresh(user.id)
        }
        val notice = if (manualRequested && result.isFailure) MANUAL_REFRESH_FAILED else null
        refreshState.value = RefreshState(notice = notice)
    }

    private suspend fun shouldRetry(result: Result<Unit>): Boolean {
        val offline = (result.exceptionOrNull() as? DataException)?.error == DataError.Offline
        return offline && !manualRequested && online.first()
    }

    private data class RefreshState(val isRefreshing: Boolean = false, val notice: String? = null)

    private companion object {
        /** Reintentos del refresco automático que falla por red con el teléfono diciendo que hay red. */
        val AUTO_RETRY_DELAYS_MS = listOf(2_000L, 5_000L)
    }
}
