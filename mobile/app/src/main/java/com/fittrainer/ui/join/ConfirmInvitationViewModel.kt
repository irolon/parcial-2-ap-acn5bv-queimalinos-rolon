package com.fittrainer.ui.join

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.invitation.InvitationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Nombre del argumento de la ruta confirm/{token}. */
const val TOKEN_ARG = "token"

/** Al darse de alta no navega: AppNavHost ve la sesión nueva y muestra las pestañas de alumno. */
@HiltViewModel
class ConfirmInvitationViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val invitations: InvitationRepository,
    private val auth: AuthRepository,
) : ViewModel() {

    private val token: String = checkNotNull(savedStateHandle[TOKEN_ARG])

    private val _uiState = MutableStateFlow<ConfirmInvitationUiState>(ConfirmInvitationUiState.Loading)
    val uiState: StateFlow<ConfirmInvitationUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun retry() {
        if (_uiState.value is ConfirmInvitationUiState.Error) load()
    }

    fun onPasswordChange(value: String) {
        _uiState.update { (it as? ConfirmInvitationUiState.Ready)?.copy(password = value, submitError = null) ?: it }
    }

    fun submit() {
        val state = _uiState.value as? ConfirmInvitationUiState.Ready ?: return
        if (!state.canSubmit) return
        _uiState.value = state.copy(isSubmitting = true, submitError = null)
        viewModelScope.launch {
            val result = auth.registerFromInvitation(token, state.password)
            if (result.isFailure) {
                val message = invitationMessage(result.exceptionOrNull())
                _uiState.update {
                    (it as? ConfirmInvitationUiState.Ready)?.copy(isSubmitting = false, submitError = message) ?: it
                }
            } else {
                // Alta lista: la contraseña no tiene que quedar en memoria. isSubmitting sigue en true
                // hasta que AppNavHost cambie a la sesión nueva.
                _uiState.update { (it as? ConfirmInvitationUiState.Ready)?.copy(password = "") ?: it }
            }
        }
    }

    private fun load() {
        _uiState.value = ConfirmInvitationUiState.Loading
        viewModelScope.launch {
            _uiState.value = invitations.get(token).fold(
                onSuccess = { ConfirmInvitationUiState.Ready(it) },
                onFailure = { ConfirmInvitationUiState.Error(invitationMessage(it)) },
            )
        }
    }
}
