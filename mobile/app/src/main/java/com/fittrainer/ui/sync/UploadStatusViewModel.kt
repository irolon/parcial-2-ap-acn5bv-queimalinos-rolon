package com.fittrainer.ui.sync

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.db.workout.SessionUploadRow
import com.fittrainer.data.db.workout.UploadCounts
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.sync.ManualSync
import com.fittrainer.data.sync.ManualSyncResult
import com.fittrainer.data.sync.UploadStatusRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * "Subir ahora" del aviso de Hoy (spec §6). REJECTED: subió, pero el servidor rechazó algo (una sesión
 * o series); no es un éxito y el aviso lo sigue mostrando. IN_BACKGROUND: no terminó dentro del tope.
 */
enum class ManualUpload { IDLE, UPLOADING, DONE, FAILED, REJECTED, IN_BACKGROUND }

/** Lo que el alumno ve de la subida: el aviso de Hoy, "Subir ahora" y la línea del resumen (spec §6). */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class UploadStatusViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
    private val status: UploadStatusRepository,
    private val manualSync: ManualSync,
) : ViewModel() {

    val counts: StateFlow<UploadCounts> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .distinctUntilChanged()
        .flatMapLatest { owner -> owner?.let(status::observeCounts) ?: flowOf(UploadCounts()) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UploadCounts())

    private val _manual = MutableStateFlow(ManualUpload.IDLE)
    val manual: StateFlow<ManualUpload> = _manual

    /** La subida a mano en curso o la que espera para limpiar su resultado. */
    private var manualJob: Job? = null

    fun session(sessionId: String): Flow<SessionUploadRow?> = status.observeSession(sessionId)

    /** Fuerza una pasada y espera su resultado (como el aviso del logout). */
    fun uploadNow() {
        if (_manual.value == ManualUpload.UPLOADING) return
        // Se marca antes de lanzar: un segundo toque ya no entra.
        _manual.value = ManualUpload.UPLOADING
        manualJob?.cancel()
        manualJob = viewModelScope.launch {
            val owner = currentOwner()
            if (owner == null) {
                _manual.value = ManualUpload.IDLE
                return@launch
            }
            val result = try {
                manualSync.run(owner).result.toManualUpload() // lo pendiente manda: el rechazo ya se ve en el aviso por los conteos
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                ManualUpload.FAILED // el alumno nunca queda atrapado en la ruedita
            }
            _manual.value = result
            // Cualquiera sea el resultado (también el de una excepción), se limpia: nunca queda pegado.
            try {
                clearWhenStale(owner, result)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Room no se pudo leer: mejor sin resultado que uno que ya no corresponde.
                if (_manual.value == result) _manual.value = ManualUpload.IDLE
            }
        }
    }

    /**
     * "Subido ✓" se va a los segundos. El resto, cuando cambian las pendientes: ya no habla de lo que
     * está a la vista (Pablo #32, ronda 2, punto 2).
     */
    private suspend fun clearWhenStale(owner: String, result: ManualUpload) {
        if (result == ManualUpload.DONE) {
            delay(DONE_VISIBLE_MS)
        } else {
            val pending = status.counts(owner).pending
            status.observeCounts(owner).first { it.pending != pending }
        }
        if (_manual.value == result) _manual.value = ManualUpload.IDLE
    }

    /** Oculta del aviso de Hoy lo que no se pudo subir hasta ahora; un rechazo nuevo vuelve a mostrarse. */
    fun dismissFailures() {
        viewModelScope.launch {
            try {
                currentOwner()?.let { status.dismissFailures(it) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Room no pudo escribir: el aviso sigue a la vista y se puede volver a tocar.
            }
        }
    }

    private suspend fun currentOwner(): String? = (sessionRepository.session.first() as? Session.Student)?.user?.id

    companion object {
        const val DONE_VISIBLE_MS = 3_000L
    }
}

private fun ManualSyncResult.toManualUpload() = when (this) {
    ManualSyncResult.DONE -> ManualUpload.DONE
    ManualSyncResult.REJECTED -> ManualUpload.REJECTED
    ManualSyncResult.OFFLINE, ManualSyncResult.FAILED -> ManualUpload.FAILED
    ManualSyncResult.STILL_UPLOADING -> ManualUpload.IN_BACKGROUND
}
