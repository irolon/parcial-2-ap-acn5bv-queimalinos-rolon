package com.fittrainer.data.notifications.push

import android.util.Log
import javax.inject.Inject

/** Log del alta y baja del token. Es `open` para que los tests JVM lo reemplacen: ahí `Log` no existe. */
open class PushLogger @Inject constructor() {
    open fun failed(what: String, error: Exception) {
        Log.w(TAG, what, error)
    }

    private companion object {
        const val TAG = "PushToken"
    }
}
