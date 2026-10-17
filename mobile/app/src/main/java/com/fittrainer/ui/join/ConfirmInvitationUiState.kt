package com.fittrainer.ui.join

import com.fittrainer.data.invitation.Invitation

const val MIN_PASSWORD_LENGTH = 8

sealed interface ConfirmInvitationUiState {
    data object Loading : ConfirmInvitationUiState

    /** No se pudo cargar la invitación: reemplaza toda la pantalla. */
    data class Error(val message: InvitationMessage) : ConfirmInvitationUiState

    data class Ready(
        val invitation: Invitation,
        val password: String = "",
        val isSubmitting: Boolean = false,
        /** Error del alta: va debajo del botón y no borra la contraseña. */
        val submitError: InvitationMessage? = null,
    ) : ConfirmInvitationUiState {
        val canSubmit: Boolean get() = password.length >= MIN_PASSWORD_LENGTH && !isSubmitting
    }
}
