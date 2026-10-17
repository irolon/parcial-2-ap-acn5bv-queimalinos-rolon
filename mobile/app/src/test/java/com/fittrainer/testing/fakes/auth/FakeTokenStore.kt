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
    override suspend fun updateAccessToken(sessionId: String, token: String) {
        flow.value = flow.value?.let { if (it.sessionId == sessionId) it.copy(accessToken = token) else it }
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
