package com.fittrainer.ui.notifications.launch

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.notifications.LaunchSources
import com.fittrainer.data.notifications.NotificationDestination
import com.fittrainer.data.notifications.NotificationLaunchRequests
import com.fittrainer.data.notifications.PendingLaunch
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.progress.ProgressOpen
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Destino a navegar y de dónde vino el tap: desde la lista el detalle se apila sobre la lista (atrás vuelve a ella). */
data class PendingNav(val target: NavTarget, val fromList: Boolean)

/**
 * Lleva el tap de un aviso (push o lista) a su pantalla. Se pide en AppNavHost, con el dueño de la actividad:
 * así vive también sin sesión y descarta el push en vez de guardarlo para después del login (spec §3.3).
 * RoleShell recibe la misma instancia y navega con [target]; Progreso lee la solapa de [progressOpen].
 */
@HiltViewModel
class NotificationLaunchViewModel @Inject constructor(
    private val requests: NotificationLaunchRequests,
    sessionRepository: SessionRepository,
    private val sources: LaunchSources,
) : ViewModel() {

    private val session: StateFlow<Session?> = sessionRepository.session.stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val _target = MutableStateFlow<PendingNav?>(null)
    val target: StateFlow<PendingNav?> = _target.asStateFlow()
    private val _progressOpen = MutableStateFlow<ProgressOpen?>(null)
    val progressOpen: StateFlow<ProgressOpen?> = _progressOpen.asStateFlow()
    private var job: Job? = null

    init {
        viewModelScope.launch {
            combine(session, requests.pending) { s, p -> s to p }.collect { (s, launch) ->
                // Mientras se lee la sesión guardada se espera; después el pedido se consume siempre, se use o no.
                if (s == null || launch == null) return@collect
                requests.consume()
                start(launch, s, fromList = false)
            }
        }
        // Si la sesión deja de ser de alumno (logout, otra cuenta), lo que estaba por abrirse se cae.
        viewModelScope.launch {
            session.collect { s ->
                if (s !is Session.Student) {
                    job?.cancel()
                    _target.value = null
                    _progressOpen.value = null
                }
            }
        }
    }

    /** Tap en la lista de avisos: la lista ya lo marcó leído, así que va sin id (no se marca dos veces). */
    fun open(destination: NotificationDestination) {
        session.value?.let { start(PendingLaunch(destination, null), it, fromList = true) }
    }

    fun onNavigated() {
        _target.value = null
    }

    fun onProgressOpenHandled() {
        _progressOpen.value = null
    }

    private fun start(launch: PendingLaunch, s: Session, fromList: Boolean) {
        job?.cancel()
        job = viewModelScope.launch {
            val resolved = resolve(launch, s, sources)
            // Si mientras se resolvía cambió la cuenta, el destino ya no es de nadie.
            if (resolved == NavTarget.None || session.value != s) return@launch
            _progressOpen.value = when (resolved) {
                NavTarget.ProgressHistory -> ProgressOpen.History
                is NavTarget.ProgressCharts -> ProgressOpen.Charts(resolved.exerciseId)
                else -> null
            }
            _target.value = PendingNav(resolved, fromList)
        }
    }
}
