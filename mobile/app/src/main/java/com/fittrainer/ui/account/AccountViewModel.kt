package com.fittrainer.ui.account

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.account.MyProfile
import com.fittrainer.data.account.ProfileRepository
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.session.role
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** La clave del SavedStateHandle de Perfil / Más con la que Cambiar contraseña avisa que salió bien. */
const val PASSWORD_CHANGED_KEY = "password_changed"

/**
 * Perfil (alumno) / Más (entrenador): el perfil sale de Room y se refresca al entrar y al volver la red. Mientras no
 * se bajó, la tarjeta usa el nombre y el email de la sesión. El alumno ve con quién entrena (del hilo del chat en Room).
 */
@HiltViewModel
class AccountViewModel @Inject constructor(
    private val repository: ProfileRepository,
    messages: TrainerMessagesRepository,
    private val sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val savedState: SavedStateHandle,
) : ViewModel() {

    private val session = sessionRepository.session.stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private val failed = MutableStateFlow(false)

    @OptIn(ExperimentalCoroutinesApi::class)
    private val profile = session.flatMapLatest { s -> s.user()?.let { repository.observe(it.id) } ?: flowOf(null) }

    @OptIn(ExperimentalCoroutinesApi::class)
    private val trainerName = session.flatMapLatest { s ->
        if (s is Session.Student) messages.observeThread(s.user.id, s.user.id).map { it?.name } else flowOf(null)
    }

    val uiState: StateFlow<AccountUiState> = combine(
        session, profile, trainerName, combine(online, failed, ::Pair), savedState.getStateFlow(PASSWORD_CHANGED_KEY, false),
    ) { s, p, trainer, (on, fail), changed -> accountState(s, p, trainer, !on, fail, changed) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AccountUiState())

    init {
        // Volvió la red: se refresca (drop(1): el estado inicial no es un cambio).
        viewModelScope.launch { online.drop(1).filter { it }.collect { refresh() } }
    }

    fun onStart() = refresh()
    fun onRetry() = refresh()
    fun onDismissRefreshFailed() {
        failed.value = false
    }
    fun onPasswordChanged() {
        savedState[PASSWORD_CHANGED_KEY] = true
    }
    fun onDismissPasswordChanged() {
        savedState[PASSWORD_CHANGED_KEY] = false
    }

    private fun refresh() {
        viewModelScope.launch {
            // La sesión puede no haber salido todavía de DataStore al entrar: se espera la primera, no se descarta.
            val s = session.filterNotNull().first()
            val user = s.user() ?: return@launch
            val role = s.role ?: return@launch
            // Sin red no es una falla: se ve lo guardado y el aviso de sin conexión.
            val result = repository.refresh(user.id, role)
            failed.value = result.isFailure && online.value
        }
    }
}

private fun Session?.user() = when (this) {
    is Session.Student -> user
    is Session.Trainer -> user
    else -> null
}

/** Arma la tarjeta: lo de Room si ya se bajó; si no, lo de la sesión. */
internal fun accountState(
    session: Session?,
    profile: MyProfile?,
    trainerName: String?,
    offline: Boolean,
    refreshFailed: Boolean,
    passwordChanged: Boolean,
): AccountUiState {
    val user = session.user() ?: return AccountUiState()
    return AccountUiState(
        role = if (session is Session.Student) Role.STUDENT else Role.TRAINER,
        name = profile?.name ?: user.name,
        email = profile?.email ?: user.email,
        phone = profile?.phone,
        avatarUrl = profile?.avatarUrl,
        professionalTitle = profile?.professionalTitle,
        trainerName = trainerName?.takeIf { it.isNotBlank() },
        everLoaded = profile != null,
        offline = offline,
        refreshFailed = refreshFailed,
        passwordChanged = passwordChanged,
    )
}
