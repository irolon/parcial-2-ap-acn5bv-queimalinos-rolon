package com.fittrainer.ui.account.password

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.account.ProfileRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.StateFlow

/** Cambiar contraseña (alumno y entrenador), con el [PasswordForm]. Al terminar, la pantalla vuelve con el aviso. */
@HiltViewModel
class ChangePasswordViewModel @Inject constructor(
    repository: ProfileRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
) : ViewModel() {

    private val form = PasswordForm(viewModelScope, repository, sessionRepository, connectivity)

    val uiState: StateFlow<ChangePasswordUiState> = form.uiState

    fun onCurrent(value: String) = form.onCurrent(value)
    fun onNew(value: String) = form.onNew(value)
    fun onRepeat(value: String) = form.onRepeat(value)
    fun onSave() = form.onSave()
}
