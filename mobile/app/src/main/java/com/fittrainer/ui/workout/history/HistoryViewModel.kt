package com.fittrainer.ui.workout.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.history.HistoryOrigin
import com.fittrainer.data.workout.history.HistoryRepository
import com.fittrainer.data.workout.history.LoadMoreResult
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
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Progreso → historial (tarjeta 12). Lee de Room; refresca al entrar y con pull. Nunca dos pedidos a la vez. */
@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val repository: HistoryRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val owner: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private val local = MutableStateFlow(HistoryUiState())
    private val _events = MutableSharedFlow<HistoryEvent>(extraBufferCapacity = 1)
    val events: SharedFlow<HistoryEvent> = _events
    private var job: Job? = null
    /** Próxima página de "Ver más"; cada refresco la vuelve a la 2. */
    private var nextPage = 2
    private var lastRefreshOkAt: Long? = null
    private var lastRefreshFailed = false
    /** Ya se eligió el filtro de arranque (o lo cambió el alumno): no se vuelve a decidir (decisión D, PR #40). */
    private var filterDecided = false
    /** Pull que llegó durante la fase 2: corre otro refresco al terminar. */
    private var refreshQueued = false

    init {
        // Cualquier refresh del repositorio (también el del badge) reemplaza la página 1: "Ver más" vuelve a la 2 (las
        // posiciones pudieron correrse) y "hay más" es lo que dice el servidor, aunque esas páginas ya estén guardadas.
        viewModelScope.launch {
            repository.refreshGeneration.drop(1).collect {
                nextPage = 2
                local.update { it.copy(hasMore = repository.totalPagesAfterRefresh > 1) }
            }
        }
        // Volvió la red: si el último refresco no salió (o nunca salió), se reintenta sin esperar al pull.
        viewModelScope.launch {
            var wasOnline = online.value
            online.collect { now ->
                if (now && !wasOnline && (lastRefreshOkAt == null || lastRefreshFailed)) refresh()
                wasOnline = now
            }
        }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    val uiState: StateFlow<HistoryUiState> =
        combine(owner.filterNotNull().flatMapLatest { repository.observe(it) }, online, local) { items, isOnline, l ->
            val (weekStart, weekEnd) = weekBounds(clock.instant(), clock.zone)
            val hasPending = items.any { it.origin == HistoryOrigin.LOCAL_PENDING }
            // El filtro de arranque se decide una vez, con la primera lista no vacía; mientras tanto, "Todos".
            val chosen = when {
                filterDecided -> l.filter
                items.isEmpty() -> HistoryFilter.ALL
                else -> defaultFilter(items, weekStart, weekEnd).also { filterDecided = true }
            }
            // "Sin subir" solo existe mientras haya algo sin subir: si se vació estando elegido, vuelve al de por defecto.
            val filter = if (chosen == HistoryFilter.PENDING && !hasPending) defaultFilter(items, weekStart, weekEnd) else chosen
            if (filter != l.filter) local.update { if (it.filter == l.filter) it.copy(filter = filter) else it }
            l.copy(
                items = items, filter = filter, hasPending = hasPending, unreadComments = items.count { it.commentUnread }, isOffline = !isOnline,
                visibleItems = filterHistory(items, filter, weekStart, weekEnd),
                weekSummary = weekSummaryText(filterHistory(items, HistoryFilter.WEEK, weekStart, weekEnd)),
                everLoaded = l.everLoaded || items.any { it.origin == HistoryOrigin.SERVER },
            )
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HistoryUiState())

    /** Al volver de un detalle no se re-baja todo: si hace menos de 5 min que se actualizó, se deja la lista. */
    fun onStart() {
        val last = lastRefreshOkAt
        if (last != null && clock.millis() - last < FRESH_MS) return
        refresh()
    }

    /** Si están bajando los detalles (fase 2), no se ignora: spinner y un refresco más apenas termine (uno solo). */
    fun onPullToRefresh() {
        if (job?.isActive == true && local.value.detailsLoading) {
            refreshQueued = true
            local.update { it.copy(isRefreshing = true) }
            return
        }
        refresh()
    }

    fun onFilterSelected(filter: HistoryFilter) {
        filterDecided = true // lo eligió el alumno: no se vuelve a decidir
        local.update { it.copy(filter = filter) }
    }

    fun dismissRefreshError() = local.update { it.copy(refreshFailed = false) }

    private fun refresh() {
        if (job?.isActive == true) return
        job = viewModelScope.launch {
            do {
                refreshQueued = false
                refreshOnce()
            } while (refreshQueued)
        }
    }

    private suspend fun refreshOnce() {
        val id = owner.filterNotNull().first()
        local.update { it.copy(isRefreshing = true, refreshFailed = false) }
        // Fase 1: la lista. Apenas está en Room se baja el spinner; los detalles siguen abajo, sin spinner.
        val list = repository.refreshList(id)
        val offline = list.isOffline()
        if (list.isSuccess) lastRefreshOkAt = clock.millis()
        lastRefreshFailed = list.isFailure
        local.update {
            it.copy(
                isRefreshing = false,
                // Sin red no es un error: se ve lo guardado con el aviso de "sin conexión".
                refreshFailed = list.isFailure && !offline,
                everLoaded = it.everLoaded || list.isSuccess,
            )
        }
        val pending = list.getOrNull() ?: return
        local.update { it.copy(detailsLoading = true) }
        val details = try {
            repository.refreshDetails(id, pending)
        } finally {
            local.update { it.copy(detailsLoading = false) }
        }
        if (details.isFailure) {
            lastRefreshFailed = true
            if (!details.isOffline()) local.update { it.copy(refreshFailed = true) }
        }
    }

    private fun Result<*>.isOffline() = (exceptionOrNull() as? DataException)?.error == DataError.Offline

    fun onLoadMore() {
        if (job?.isActive == true) return
        if (!online.value) {
            _events.tryEmit(HistoryEvent.NeedsConnection)
            return
        }
        job = viewModelScope.launch {
            val id = owner.filterNotNull().first()
            local.update { it.copy(loadingMore = true) }
            val refreshGen = repository.refreshGeneration.value
            val result = repository.loadMore(id, nextPage)
            // Si un refresh reemplazó la página 1 mientras bajaba, la respuesta es de antes del reinicio: no se aplica.
            result.onSuccess { r ->
                if (r is LoadMoreResult.Page && repository.refreshGeneration.value == refreshGen) {
                    nextPage = r.nextPage
                    local.update { it.copy(hasMore = r.hasMore) }
                }
            }
            result.onFailure {
                val offline = (it as? DataException)?.error == DataError.Offline
                _events.tryEmit(if (offline) HistoryEvent.NeedsConnection else HistoryEvent.LoadMoreFailed)
            }
            local.update { it.copy(loadingMore = false) }
        }
    }

    private companion object {
        const val FRESH_MS = 5 * 60_000L
    }
}
