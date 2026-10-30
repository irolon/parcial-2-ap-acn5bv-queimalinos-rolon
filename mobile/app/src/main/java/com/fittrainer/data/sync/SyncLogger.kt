package com.fittrainer.data.sync

import android.util.Log
import javax.inject.Inject

/** Log de la sincronización. Es `open` para que los tests JVM lo reemplacen: ahí `Log` no existe. */
open class SyncLogger @Inject constructor() {
    open fun enqueueFailed(error: Exception) {
        Log.w(TAG, "No se pudo encolar la subida de sesiones", error)
    }

    private companion object {
        const val TAG = "SyncTrigger"
    }
}
