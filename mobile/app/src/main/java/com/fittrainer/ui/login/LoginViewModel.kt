package com.fittrainer.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.launch

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
) : ViewModel() {
    fun signInAs(role: Role) {
        viewModelScope.launch { sessionRepository.signInAs(role) }
    }
}
