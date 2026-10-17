package com.fittrainer.navigation

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Token que llegó por deep link y todavía no se usó. Lo escribe MainActivity y lo consume la
 * navegación: sin sesión abre la confirmación; con sesión se muestra un aviso y se descarta.
 */
@Singleton
class PendingInvitation @Inject constructor() {
    private val _token = MutableStateFlow<String?>(null)
    val token: StateFlow<String?> = _token.asStateFlow()

    fun offer(token: String) {
        _token.value = token
    }

    fun consume() {
        _token.value = null
    }
}
