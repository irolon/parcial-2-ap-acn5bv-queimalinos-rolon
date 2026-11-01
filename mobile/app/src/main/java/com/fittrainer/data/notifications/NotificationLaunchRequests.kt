package com.fittrainer.data.notifications

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Lo que pidió abrir un push: el destino y, si el push lo trae, el aviso a marcar como leído. */
data class PendingLaunch(val destination: NotificationDestination, val notificationId: String?)

/** Los extras del intent son los pares `data` del push. Sin `type` el intent no viene de un push. */
fun launchFromExtras(extras: Map<String, String>): PendingLaunch? {
    val type = extras["type"] ?: return null
    return PendingLaunch(destinationOf(type, extras), extras["notification_id"])
}

/**
 * Relanzada desde Recientes el intent conserva los extras del push viejo: no se vuelve a ofrecer.
 */
fun launchFromIntent(launchedFromHistory: Boolean, extras: Map<String, String>): PendingLaunch? =
    if (launchedFromHistory) null else launchFromExtras(extras)

/** El tap de un push lo anota MainActivity y la navegación lo consume (cuando hay sesión de alumno). */
@Singleton
class NotificationLaunchRequests @Inject constructor() {
    private val _pending = MutableStateFlow<PendingLaunch?>(null)
    val pending: StateFlow<PendingLaunch?> = _pending.asStateFlow()

    fun request(launch: PendingLaunch) {
        _pending.value = launch
    }

    fun consume() {
        _pending.value = null
    }
}
