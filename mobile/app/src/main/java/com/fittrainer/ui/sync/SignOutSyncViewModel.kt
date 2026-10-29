package com.fittrainer.ui.sync

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.sync.SessionSync
import com.fittrainer.data.sync.UploadStatusRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

sealed interface SignOutSyncState {
    data object Hidden : SignOutSyncState
    data class Asking(val pending: Int) : SignOutSyncState
    data object Uploading : SignOutSyncState
    data class Failed(val pending: Int) : SignOutSyncState
}

/** Aviso del logout con entrenamientos sin subir (spec §6): Subir ahora, Cerrar igual o Cancelar. */
@HiltViewModel
class SignOutSyncViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
    private val status: UploadStatusRepository,
    private val sync: SessionSync,
    private val connectivity: ConnectivityObserver,
) : ViewModel() {

    private val _state = MutableStateFlow<SignOutSyncState>(SignOutSyncState.Hidden)
    val state: StateFlow<SignOutSyncState> = _state

    /** El logout que se completa al cerrar el aviso; null si no hay aviso abierto. */
    private var signOut: (() -> Unit)? = null

    fun request(onSignOut: () -> Unit) {
        if (_state.value != SignOutSyncState.Hidden) return
        viewModelScope.launch {
            val owner = currentOwner() ?: return@launch onSignOut()
            val pending = status.pendingCount(owner)
            if (pending == 0) return@launch onSignOut()
            signOut = onSignOut
            _state.value = SignOutSyncState.Asking(pending)
        }
    }

    fun uploadNow() {
        val onSignOut = signOut ?: return
        val lastPending = when (val current = _state.value) {
            is SignOutSyncState.Asking -> current.pending
            is SignOutSyncState.Failed -> current.pending
            else -> return
        }
        // Se marca Uploading antes de lanzar: un segundo toque ya no entra.
        _state.value = SignOutSyncState.Uploading
        viewModelScope.launch {
            try {
                val owner = currentOwner() ?: return@launch close(onSignOut)
                // Sin red no tiene sentido esperar 15 s: se avisa enseguida.
                if (!connectivity.isOnline.first()) {
                    _state.value = SignOutSyncState.Failed(status.pendingCount(owner))
                    return@launch
                }
                sync.syncNow(SYNC_NOW_TIMEOUT_MS)
                val left = status.pendingCount(owner)
                if (left == 0) close(onSignOut) else _state.value = SignOutSyncState.Failed(left)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // El alumno nunca queda atrapado en la ruedita.
                _state.value = SignOutSyncState.Failed(lastPending)
            }
        }
    }

    fun signOutAnyway() {
        if (_state.value == SignOutSyncState.Uploading) return
        signOut?.let(::close)
    }

    fun cancel() {
        if (_state.value == SignOutSyncState.Uploading) return
        signOut = null
        _state.value = SignOutSyncState.Hidden
    }

    private fun close(onSignOut: () -> Unit) {
        signOut = null
        _state.value = SignOutSyncState.Hidden
        onSignOut()
    }

    private suspend fun currentOwner(): String? = (sessionRepository.session.first() as? Session.Student)?.user?.id

    companion object {
        const val SYNC_NOW_TIMEOUT_MS = 15_000L
    }
}
