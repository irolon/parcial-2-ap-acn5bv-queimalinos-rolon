package com.fittrainer.ui.sync

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.db.workout.SessionUploadRow
import com.fittrainer.data.db.workout.UploadCounts
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.sync.SessionSync
import com.fittrainer.data.sync.UploadStatusRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
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
 * o series); no es un éxito y el aviso lo sigue mostrando.
 */
enum class ManualUpload { IDLE, UPLOADING, DONE, FAILED, REJECTED }

/** Lo que el alumno ve de la subida: el aviso de Hoy, "Subir ahora" y la línea del resumen (spec §6). */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class UploadStatusViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
    private val status: UploadStatusRepository,
    private val sync: SessionSync,
    private val connectivity: ConnectivityObserver,
) : ViewModel() {

    val counts: StateFlow<UploadCounts> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .distinctUntilChanged()
        .flatMapLatest { owner -> owner?.let(status::observeCounts) ?: flowOf(UploadCounts()) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UploadCounts())

    private val _manual = MutableStateFlow(ManualUpload.IDLE)
    val manual: StateFlow<ManualUpload> = _manual

    fun session(sessionId: String): Flow<SessionUploadRow?> = status.observeSession(sessionId)

    /** Fuerza una pasada y espera su resultado (como el aviso del logout). "Subido ✓" se va solo. */
    fun uploadNow() {
        if (_manual.value == ManualUpload.UPLOADING) return
        // Se marca antes de lanzar: un segundo toque ya no entra.
        _manual.value = ManualUpload.UPLOADING
        viewModelScope.launch {
            val result = try {
                upload()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                ManualUpload.FAILED // el alumno nunca queda atrapado en la ruedita
            }
            _manual.value = result
            if (result == ManualUpload.DONE) {
                delay(DONE_VISIBLE_MS)
                if (_manual.value == ManualUpload.DONE) _manual.value = ManualUpload.IDLE
            }
        }
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

    private suspend fun upload(): ManualUpload {
        val owner = currentOwner() ?: return ManualUpload.IDLE
        // Sin red no tiene sentido esperar: se avisa enseguida y WorkManager sube cuando vuelva.
        if (!connectivity.isOnline.first()) return ManualUpload.FAILED
        val before = status.counts(owner)
        sync.syncNow(SignOutSyncViewModel.SYNC_NOW_TIMEOUT_MS)
        val after = status.counts(owner)
        // Una sesión rechazada deja de estar pendiente (queda FAILED): "sin pendientes" no alcanza para el éxito.
        return when {
            after.pending > 0 -> ManualUpload.FAILED
            after.rejections > before.rejections -> ManualUpload.REJECTED
            else -> ManualUpload.DONE
        }
    }

    companion object {
        const val DONE_VISIBLE_MS = 3_000L
    }
}
