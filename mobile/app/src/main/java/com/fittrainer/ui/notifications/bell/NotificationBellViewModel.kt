package com.fittrainer.ui.notifications.bell

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * Campana de Hoy: avisos sin leer. Lee de Room; para que el número aparezca sin abrir la lista, refresca al abrir
 * la app (con red y como mucho cada 5 min), sin UI de error. Al volver la red sube las lecturas pendientes.
 */
@HiltViewModel
class NotificationBellViewModel @Inject constructor(
    private val repository: NotificationsRepository,
    sessionRepository: SessionRepository,
    private val connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val owner: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private var job: Job? = null
    private var lastRefreshAt: Long? = null

    init {
        // Otra cuenta (o un logout) no hereda el "ya refresqué hace poco" de la anterior. La primera sesión de un
        // arranque en frío no cuenta: ahí todavía no había dueño.
        viewModelScope.launch {
            var previous: String? = null
            owner.collect { id ->
                if (previous != null && id != previous) {
                    lastRefreshAt = null
                    job?.cancel()
                }
                previous = id
            }
        }
        viewModelScope.launch {
            var wasOnline: Boolean? = null
            connectivity.isOnline.collect { now ->
                // Solo la transición sin red → con red: el primer valor es el estado de arranque.
                if (now && wasOnline == false) owner.value?.let { repository.uploadPendingReads(it) }
                wasOnline = now
            }
        }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    val unread: StateFlow<Int> = owner
        .flatMapLatest { id -> id?.let(repository::observeUnread) ?: flowOf(0) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    /**
     * Cada vez que la app pasa a primer plano. En frío la sesión todavía no salió de DataStore: el dueño se espera
     * adentro del launch. Si nunca hay alumno el job queda esperando y se cancela con el scope.
     */
    fun onAppStart() {
        val last = lastRefreshAt
        if (!online.value || job?.isActive == true || (last != null && clock.millis() - last < FRESH_MS)) return
        lastRefreshAt = clock.millis()
        job = viewModelScope.launch { repository.refresh(owner.filterNotNull().first()) }
    }

    private companion object {
        const val FRESH_MS = 5 * 60_000L
    }
}
