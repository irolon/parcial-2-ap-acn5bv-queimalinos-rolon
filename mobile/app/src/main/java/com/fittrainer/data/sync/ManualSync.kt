package com.fittrainer.data.sync

import com.fittrainer.data.network.ConnectivityObserver
import javax.inject.Inject
import kotlinx.coroutines.flow.first

/** Cómo terminó un "Subir ahora" (spec §6). */
enum class ManualSyncResult {
    /** No queda nada pendiente y el servidor no rechazó nada nuevo. */
    DONE,

    /** Subió, pero el servidor rechazó algo (una sesión o series): no es un éxito. */
    REJECTED,

    /** Sin red: ni se intenta, WorkManager sube cuando vuelva. */
    OFFLINE,

    /** La pasada terminó con algo pendiente (por ejemplo un 5xx): WorkManager reintenta con backoff. */
    FAILED,

    /** La pasada no terminó dentro del tope: sigue subiendo en segundo plano. */
    STILL_UPLOADING,
}

/** Fuerza una pasada y dice cómo quedó. Lo usan el aviso de Hoy y el del logout. */
class ManualSync @Inject constructor(
    private val status: UploadStatusRepository,
    private val sync: SessionSync,
    private val connectivity: ConnectivityObserver,
) {
    suspend fun run(owner: String): ManualSyncResult {
        // Sin red no tiene sentido esperar el tope: se avisa enseguida.
        if (!connectivity.isOnline.first()) return ManualSyncResult.OFFLINE
        val before = status.counts(owner)
        val finished = sync.syncNow(TIMEOUT_MS)
        val after = status.counts(owner)
        // Una sesión rechazada deja de estar pendiente (queda FAILED): "sin pendientes" no alcanza para el éxito.
        return when {
            after.pending > 0 && !finished -> ManualSyncResult.STILL_UPLOADING
            after.pending > 0 -> ManualSyncResult.FAILED
            after.rejections > before.rejections -> ManualSyncResult.REJECTED
            else -> ManualSyncResult.DONE
        }
    }

    companion object {
        const val TIMEOUT_MS = 15_000L
    }
}
