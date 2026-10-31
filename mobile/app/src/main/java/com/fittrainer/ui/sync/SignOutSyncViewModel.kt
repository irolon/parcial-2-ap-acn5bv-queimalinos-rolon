package com.fittrainer.ui.sync

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.sync.ManualSync
import com.fittrainer.data.sync.ManualSyncResult
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
    data class Asking(val pending: Int, val feedback: Int = 0) : SignOutSyncState
    data object Uploading : SignOutSyncState
    data class Failed(val pending: Int, val feedback: Int = 0) : SignOutSyncState

    /** Subió todo, pero el servidor rechazó algo: se avisa antes de cerrar (queda guardado en el celular). */
    data object Rejected : SignOutSyncState

    /** Hay que completar el logout: RoleShell llama a su onSignOut y avisa con [SignOutSyncViewModel.signOutHandled]. */
    data object SignOut : SignOutSyncState
}

/** Aviso del logout con entrenamientos sin subir (spec §6): Subir ahora, Cerrar igual o Cancelar. */
@HiltViewModel
class SignOutSyncViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
    private val status: UploadStatusRepository,
    private val manualSync: ManualSync,
) : ViewModel() {

    private val _state = MutableStateFlow<SignOutSyncState>(SignOutSyncState.Hidden)
    val state: StateFlow<SignOutSyncState> = _state

    fun request() {
        if (_state.value != SignOutSyncState.Hidden) return
        viewModelScope.launch {
            val owner = currentOwner() ?: return@launch close()
            val counts = status.counts(owner)
            _state.value = if (counts.pending + counts.pendingFeedback == 0) SignOutSyncState.SignOut
            else SignOutSyncState.Asking(counts.pending, counts.pendingFeedback)
        }
    }

    fun uploadNow() {
        val last = when (val current = _state.value) {
            is SignOutSyncState.Asking -> SignOutSyncState.Failed(current.pending, current.feedback)
            is SignOutSyncState.Failed -> current
            else -> return
        }
        // Se marca Uploading antes de lanzar: un segundo toque ya no entra.
        _state.value = SignOutSyncState.Uploading
        viewModelScope.launch {
            try {
                val owner = currentOwner() ?: return@launch close()
                when (manualSync.run(owner)) {
                    ManualSyncResult.DONE -> close()
                    ManualSyncResult.REJECTED -> _state.value = SignOutSyncState.Rejected
                    // Sin red, con error o todavía subiendo: queda pendiente, se ofrece cerrar igual.
                    else -> _state.value = status.counts(owner).let { SignOutSyncState.Failed(it.pending, it.pendingFeedback) }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // El alumno nunca queda atrapado en la ruedita.
                _state.value = last
            }
        }
    }

    fun signOutAnyway() {
        if (isAsking()) close()
    }

    fun cancel() {
        if (isAsking()) _state.value = SignOutSyncState.Hidden
    }

    /** Hay un aviso abierto esperando respuesta (no subiendo ni cerrando). */
    private fun isAsking() = when (_state.value) {
        is SignOutSyncState.Asking, is SignOutSyncState.Failed, SignOutSyncState.Rejected -> true
        else -> false
    }

    /** RoleShell ya completó el logout. */
    fun signOutHandled() {
        if (_state.value == SignOutSyncState.SignOut) _state.value = SignOutSyncState.Hidden
    }

    private fun close() {
        _state.value = SignOutSyncState.SignOut
    }

    private suspend fun currentOwner(): String? = (sessionRepository.session.first() as? Session.Student)?.user?.id
}
