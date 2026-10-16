package com.fittrainer.ui.join

import androidx.lifecycle.ViewModel
import com.fittrainer.data.invitation.InvitationLink
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

const val NOT_AN_INVITATION = "Este código no es una invitación de FitTrainer"

@HiltViewModel
class JoinViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(JoinUiState())
    val uiState: StateFlow<JoinUiState> = _uiState.asStateFlow()

    fun onLinkChange(value: String) {
        _uiState.update { it.copy(link = value, linkError = null) }
    }

    fun submitLink() {
        val token = InvitationLink.parse(_uiState.value.link)
        _uiState.update { if (token == null) it.copy(linkError = NOT_AN_INVITATION) else it.copy(token = token) }
    }

    /** Lo llama el analizador de la cámara con cada QR que lee (puede ser varias veces por segundo). */
    fun onQrScanned(raw: String) {
        _uiState.update { state ->
            if (state.token != null) return@update state // ya hay una navegación en curso
            val token = InvitationLink.parse(raw)
            if (token == null) state.copy(scanError = NOT_AN_INVITATION) else state.copy(token = token, scanError = null)
        }
    }

    fun onNavigated() {
        _uiState.update { it.copy(token = null) }
    }
}
