package com.fittrainer.ui.invitations

import com.fittrainer.data.invitation.invite.CreatedInvitation
import com.fittrainer.data.invitation.invite.InviteField
import com.fittrainer.data.invitation.invite.InviteForm

sealed interface InviteUiState {
    /**
     * errors: los del formulario (se muestran después del primer intento de envío) más los que mandó
     * el servidor, que se borran al editar ese campo. notice: aviso general (red, error del servidor).
     */
    data class Editing(
        val form: InviteForm = InviteForm(),
        val errors: Map<InviteField, String> = emptyMap(),
        val showMore: Boolean = false,
        val sending: Boolean = false,
        val offline: Boolean = false,
        val notice: String? = null,
    ) : InviteUiState {
        val canSubmit: Boolean get() = !sending && !offline
    }

    data class Done(val invitation: CreatedInvitation, val studentName: String) : InviteUiState
}
