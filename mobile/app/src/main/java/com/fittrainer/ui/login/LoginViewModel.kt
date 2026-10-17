package com.fittrainer.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Al loguearse no navega: AppNavHost observa la sesión y cambia de pantalla solo. */
@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun onEmailChange(value: String) {
        _uiState.update { it.copy(email = value, emailError = null, error = null) }
    }

    fun onPasswordChange(value: String) {
        _uiState.update { it.copy(password = value, error = null) }
    }

    fun submit() {
        val state = _uiState.value
        if (!state.canSubmit) return
        val email = state.email.trim()
        if (!EMAIL_REGEX.matches(email)) {
            _uiState.update { it.copy(emailError = "Email con formato inválido") }
            return
        }
        _uiState.update { it.copy(isLoading = true, error = null, emailError = null) }
        viewModelScope.launch {
            val result = authRepository.login(email, state.password)
            if (result.isSuccess) {
                // El ViewModel sobrevive al logout (scope Activity): no dejar credenciales en el form.
                _uiState.value = LoginUiState()
            } else {
                _uiState.update {
                    it.copy(isLoading = false, error = result.exceptionOrNull()?.let(::toMessage))
                }
            }
        }
    }

    private fun toMessage(error: Throwable): String = when ((error as? DataException)?.error) {
        DataError.InvalidCredentials -> "Email o contraseña incorrectos"
        DataError.Offline -> "Sin conexión con el servidor"
        else -> "No se pudo iniciar sesión"
    }

    private companion object {
        // Mismo criterio que el backend (validations/auth).
        val EMAIL_REGEX = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
    }
}
