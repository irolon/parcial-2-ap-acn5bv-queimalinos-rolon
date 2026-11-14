package com.fittrainer.ui.account.password

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.account.CURRENT_REQUIRED_ERROR
import com.fittrainer.data.account.FieldErrorsException
import com.fittrainer.data.account.ProfileRepository
import com.fittrainer.data.account.newPasswordError
import com.fittrainer.data.account.repeatError
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.session.userId
import com.fittrainer.ui.account.SAVE_FAILED
import com.fittrainer.ui.account.saveFailure
import com.fittrainer.ui.account.unshownMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Los campos del body de `PUT /auth/password` que tienen su lugar en la pantalla. */
private const val CURRENT_FIELD = "current_password"
private const val NEW_FIELD = "new_password"

/** Los tres campos, sus errores y el estado del envío. Las claves no van al SavedStateHandle (no quedan en disco). */
data class ChangePasswordUiState(
    val current: String = "",
    val new: String = "",
    val repeat: String = "",
    val currentError: String? = null,
    val newError: String? = null,
    val repeatError: String? = null,
    val error: String? = null,
    val saving: Boolean = false,
    val offline: Boolean = false,
    val done: Boolean = false,
) {
    val canSave: Boolean get() = !offline && !saving && current.isNotEmpty() && new.isNotEmpty() && repeat.isNotEmpty()
}

/**
 * Cambiar contraseña (alumno y entrenador): las reglas se avisan antes de mandar; "actual incorrecta" la dice el
 * backend con un 400 en `current_password`. Solo con red. Al terminar, la pantalla vuelve con el aviso.
 */
@HiltViewModel
class ChangePasswordViewModel @Inject constructor(
    private val repository: ProfileRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
) : ViewModel() {

    private val session = sessionRepository.session.stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val local = MutableStateFlow(ChangePasswordUiState())

    val uiState: StateFlow<ChangePasswordUiState> = combine(local, connectivity.isOnline) { l, on -> l.copy(offline = !on) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ChangePasswordUiState())

    fun onCurrent(value: String) = local.update { it.copy(current = value, currentError = null, error = null) }
    fun onNew(value: String) = local.update { it.copy(new = value, newError = null, error = null) }
    fun onRepeat(value: String) = local.update { it.copy(repeat = value, repeatError = null, error = null) }

    fun onSave() {
        val s = local.value
        if (!uiState.value.canSave) return
        val owner = session.value.userId ?: return
        val currentError = if (s.current.isEmpty()) CURRENT_REQUIRED_ERROR else null
        val newError = newPasswordError(s.current, s.new)
        val repeatError = repeatError(s.new, s.repeat)
        if (currentError != null || newError != null || repeatError != null) {
            return local.update { it.copy(currentError = currentError, newError = newError, repeatError = repeatError) }
        }
        local.update { it.copy(saving = true, error = null) }
        viewModelScope.launch {
            val result = repository.changePassword(owner, s.current, s.new)
            local.update { l -> result.fold({ l.copy(saving = false, done = true) }, { e -> failed(l.copy(saving = false), e) }) }
        }
    }

    private fun failed(l: ChangePasswordUiState, e: Throwable): ChangePasswordUiState {
        if (e !is FieldErrorsException) return l.copy(error = saveFailure(e))
        val current = e.fields[CURRENT_FIELD]
        val new = e.fields[NEW_FIELD]
        val general = e.unshownMessage(setOf(CURRENT_FIELD, NEW_FIELD))
        return l.copy(
            currentError = current,
            newError = new,
            error = general ?: if (current == null && new == null) SAVE_FAILED else null,
        )
    }
}
