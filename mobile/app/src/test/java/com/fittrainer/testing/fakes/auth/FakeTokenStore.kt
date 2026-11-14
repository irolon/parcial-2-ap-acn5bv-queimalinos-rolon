package com.fittrainer.testing.fakes.auth

import com.fittrainer.data.auth.AuthState
import com.fittrainer.data.auth.tokenstore.TokenStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

/** TokenStore en memoria. [saveError], [clearError] y [readError] simulan fallas del almacenamiento. */
class FakeTokenStore(initial: AuthState? = null) : TokenStore {
    val flow = MutableStateFlow(initial)
    var saveError: Throwable? = null
    var clearError: Throwable? = null
    var readError: Throwable? = null
    var clearCalls = 0
    override val state: Flow<AuthState?> = flow
    override suspend fun current(): AuthState? = flow.value
    override suspend fun read(): AuthState? {
        readError?.let { throw it }
        return flow.value
    }
    override suspend fun save(state: AuthState) {
        saveError?.let { throw it }
        flow.value = state
    }
    /** Cuántas veces se llamó a setMustChangePassword (el cambio de clave tiene que escribir token y marca juntos). */
    var mustChangeCalls = 0
    override suspend fun updateAccessToken(sessionId: String, token: String, expectedAccess: String?, mustChangePassword: Boolean?) {
        flow.value = flow.value?.let {
            val same = it.sessionId == sessionId && (expectedAccess == null || it.accessToken == expectedAccess)
            val user = mustChangePassword?.let { m -> it.user.copy(mustChangePassword = m) } ?: it.user
            if (same) it.copy(accessToken = token, user = user) else it
        }
    }
    override suspend fun updateUserName(sessionId: String, name: String) {
        flow.value = flow.value?.let { if (it.sessionId == sessionId) it.copy(user = it.user.copy(name = name)) else it }
    }
    override suspend fun setMustChangePassword(sessionId: String, value: Boolean, accessToken: String?) {
        mustChangeCalls++
        flow.value = flow.value?.let {
            val same = it.sessionId == sessionId && (accessToken == null || it.accessToken == accessToken)
            if (same) it.copy(user = it.user.copy(mustChangePassword = value)) else it
        }
    }
    override suspend fun clear() {
        clearCalls++
        clearError?.let { throw it }
        flow.value = null
    }
    override suspend fun clearIf(sessionId: String) {
        if (flow.value?.sessionId == sessionId) clear()
    }
}
