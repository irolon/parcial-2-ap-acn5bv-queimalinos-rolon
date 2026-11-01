package com.fittrainer.ui.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.notifications.AppNotification
import com.fittrainer.data.notifications.NotificationPermission
import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.data.notifications.destinationOf
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Lista de avisos del alumno (tarjeta 17). Lee de Room; refresca al entrar y con pull. Nunca dos pedidos a la vez. */
@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val repository: NotificationsRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val permission: NotificationPermission,
    private val clock: Clock,
) : ViewModel() {

    /** Lo que no sale de Room: el estado del pedido en curso y el permiso. */
    private data class Local(val isRefreshing: Boolean = false, val refreshFailed: Boolean = false, val enabled: Boolean = true)

    private data class Stored(val items: List<AppNotification>, val everLoaded: Boolean, val hasMore: Boolean)

    private val owner: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private val local = MutableStateFlow(Local())
    private val _events = MutableSharedFlow<NotificationsEvent>(extraBufferCapacity = 1)
    val events: SharedFlow<NotificationsEvent> = _events
    private var refreshJob: Job? = null
    private var moreJob: Job? = null
    private val opening = mutableSetOf<String>()

    @OptIn(ExperimentalCoroutinesApi::class)
    val uiState: StateFlow<NotificationsUiState> = combine(
        owner.filterNotNull().flatMapLatest { id ->
            combine(repository.observe(id), repository.everLoaded(id), repository.hasMore(id), ::Stored)
        },
        online,
        local,
    ) { stored, isOnline, l ->
        val now = clock.instant()
        NotificationsUiState(
            groups = group(stored.items, now, clock.zone),
            hasUnread = stored.items.any { !it.read },
            now = now,
            isOffline = !isOnline,
            isRefreshing = l.isRefreshing,
            refreshFailed = l.refreshFailed,
            everLoaded = stored.everLoaded,
            hasMore = stored.hasMore,
            notificationsEnabled = l.enabled,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), NotificationsUiState())

    /** Al quedar visible (también al volver de Ajustes): relee el permiso y refresca. */
    fun onStart() {
        local.update { it.copy(enabled = permission.enabled()) }
        refresh()
    }

    fun onRefresh() = refresh()

    private fun refresh() {
        if (refreshJob?.isActive == true) return
        // Un refresco le gana a una carga de más páginas: la corta (el cursor se vuelve a decidir con el refresco).
        moreJob?.cancel()
        refreshJob = viewModelScope.launch {
            val id = owner.filterNotNull().first()
            local.update { it.copy(isRefreshing = true, refreshFailed = false) }
            val result = repository.refresh(id)
            // Sin red no es un error: se ve lo guardado con el aviso de "sin conexión". Pero un Offline (IOException,
            // p. ej. un timeout) con red sí lo es: "No pudimos actualizar" + Reintentar.
            val offlineError = (result.exceptionOrNull() as? DataException)?.error == DataError.Offline
            val failed = result.isFailure && !(offlineError && !online.value)
            local.update { it.copy(isRefreshing = false, refreshFailed = failed) }
        }
    }

    /** Al llegar al final de la lista. Si falla se ignora: al volver a llegar al final se reintenta. */
    fun onLoadMore() {
        if (refreshJob?.isActive == true || moreJob?.isActive == true || !online.value) return
        moreJob = viewModelScope.launch { repository.loadMore(owner.filterNotNull().first()) }
    }

    fun onMarkAllRead() {
        viewModelScope.launch { repository.markAllRead(owner.filterNotNull().first()) }
    }

    /**
     * Marca leído en Room (si no lo estaba), avisa a dónde ir y recién después sube la marca: la navegación nunca
     * espera a la red. Un segundo toque sobre el mismo aviso mientras se atiende el primero se ignora.
     */
    fun onOpen(item: AppNotification) {
        if (!opening.add(item.id)) return
        viewModelScope.launch {
            val id = owner.filterNotNull().first()
            try {
                if (!item.read) repository.markReadLocal(id, item.id)
                _events.tryEmit(NotificationsEvent.Open(destinationOf(item.type.wire, item.data)))
            } finally {
                opening.remove(item.id)
            }
            if (!item.read) repository.uploadPendingReads(id)
        }
    }
}
