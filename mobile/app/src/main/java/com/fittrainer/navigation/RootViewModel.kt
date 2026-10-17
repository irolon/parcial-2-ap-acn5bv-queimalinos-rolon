package com.fittrainer.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.session.LogoutResult
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Decide la navegación raíz según la sesión. null = todavía leyendo DataStore. */
@HiltViewModel
class RootViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
    private val pending: PendingInvitation,
) : ViewModel() {

    val session: StateFlow<Session?> =
        sessionRepository.session.stateIn(viewModelScope, SharingStarted.Eagerly, null)

    // Resultado del último logout; se reinicia al empezar cada logout y al descartar el aviso.
    private val lastSignOut = MutableStateFlow<LogoutResult?>(null)

    /**
     * Aviso para el login cuando el último logout no se pudo guardar en el dispositivo. Solo vale sin
     * sesión: con una sesión nueva (login posterior) el aviso ya no aplica.
     */
    val signOutWarning: StateFlow<String?> = combine(lastSignOut, session) { result, session ->
        SIGN_OUT_WARNING.takeIf { result == LogoutResult.Incomplete && session == Session.LoggedOut }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, null)

    init {
        // Con una sesión nueva el resultado del logout anterior ya no aplica: si después la sesión se
        // cierra por otro camino (p. ej. refresh rechazado), el aviso viejo no tiene que reaparecer.
        viewModelScope.launch {
            session.collect { if (it is Session.Student || it is Session.Trainer) lastSignOut.value = null }
        }
    }

    /** Token de un deep link pendiente; sin sesión lo consume LoggedOutNavHost. */
    val pendingInvitation: StateFlow<String?> = pending.token

    /** Llegó una invitación con una sesión iniciada: no se cierra sola, se avisa. */
    val invitationWhileLoggedIn: StateFlow<Boolean> = combine(pending.token, session) { token, session ->
        token != null && (session is Session.Student || session is Session.Trainer)
    }.stateIn(viewModelScope, SharingStarted.Eagerly, false)

    fun consumePendingInvitation() = pending.consume()

    fun dismissPendingInvitation() = pending.consume()

    fun signOut() {
        viewModelScope.launch {
            lastSignOut.value = null
            lastSignOut.value = sessionRepository.signOut()
        }
    }

    fun dismissSignOutWarning() {
        lastSignOut.value = null
    }

    companion object {
        const val SIGN_OUT_WARNING =
            "No se pudo cerrar la sesión en este dispositivo. Si la app se reinicia, puede volver a aparecer."
    }
}
