package com.fittrainer.ui.workout.history.badge

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.history.HistoryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * Badge de la pestaña Progreso: comentarios nuevos del entrenador sin leer. Lee de Room; para que aparezca
 * sin entrar a Progreso, refresca el historial al abrir la app (con red y como mucho cada 5 min), sin UI de error.
 */
@HiltViewModel
class ProgressBadgeViewModel @Inject constructor(
    private val repository: HistoryRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val owner: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private var job: Job? = null
    private var lastRefreshAt: Long? = null

    @OptIn(ExperimentalCoroutinesApi::class)
    val unread: StateFlow<Int> = owner
        .flatMapLatest { id -> id?.let(repository::observeUnreadComments) ?: flowOf(0) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    /** Cada vez que la app pasa a primer plano. */
    fun onAppStart() {
        val id = owner.value ?: return
        val last = lastRefreshAt
        if (!online.value || job?.isActive == true || (last != null && clock.millis() - last < FRESH_MS)) return
        lastRefreshAt = clock.millis()
        job = viewModelScope.launch { repository.refresh(id) }
    }

    private companion object {
        const val FRESH_MS = 5 * 60_000L
    }
}
