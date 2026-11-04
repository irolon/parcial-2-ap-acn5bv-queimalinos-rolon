package com.fittrainer.data.auth.logout

import android.util.Log
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException

/**
 * [LogoutRetryQueue] sobre el archivo cifrado y WorkManager. [hold] guarda el pendiente y espera a que la pasada
 * quede programada. Si eso falla (o el proceso muere en el medio), el pendiente igual quedó guardado y [resume]
 * vuelve a programarla al abrir la app.
 */
class PendingLogoutQueue @Inject constructor(
    private val store: PendingLogoutStore,
    private val scheduler: LogoutRetryScheduler,
    private val logger: LogoutRetryLogger,
) : LogoutRetryQueue {

    override suspend fun hold(item: PendingLogout) = safely("No se pudo guardar el logout para reintentarlo") {
        store.add(item)
        scheduler.schedule()
    }

    override suspend fun release(refreshToken: String, pushTokenRemoved: Boolean) =
        safely("No se pudo soltar el logout ya enviado") {
            // Misma escritura: sacar el pendiente y anotar el alta. La pasada que la confirma es la que programó
            // hold; se vuelve a pedir por si aquella no quedó programada (si esto falla, la retoma resume).
            store.remove(setOf(refreshToken), reregister = pushTokenRemoved)
            if (pushTokenRemoved) scheduler.schedule()
        }

    override suspend fun resume() = safely("No se pudo retomar el reintento del logout") {
        if (store.hasWork()) scheduler.schedule()
    }

    private suspend fun safely(what: String, block: suspend () -> Unit) {
        try {
            block()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            logger.failed(what, e)
        }
    }
}

/** Log de los errores del reintento (abierta para que los tests JVM, sin `Log`, la reemplacen). */
open class LogoutRetryLogger @Inject constructor() {
    open fun failed(what: String, error: Exception) {
        Log.w("LogoutRetry", what, error)
    }
}
