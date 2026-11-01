package com.fittrainer.testing.fakes.notifications

import com.fittrainer.data.notifications.push.FcmTokenSource
import kotlinx.coroutines.CompletableDeferred

class FakeFcmTokenSource(var token: String = "fcm-token-1", var error: Exception? = null) : FcmTokenSource {
    /** Si está puesto, el token nunca llega hasta que se complete. */
    var gate: CompletableDeferred<Unit>? = null

    override suspend fun token(): String {
        error?.let { throw it }
        gate?.await()
        return token
    }
}
