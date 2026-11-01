package com.fittrainer.ui.notifications

import com.fittrainer.data.notifications.AppNotification
import com.fittrainer.data.notifications.NotificationDestination
import java.time.Instant

/**
 * groups: avisos por día (Hoy · Ayer · Antes). everLoaded: alguna vez se bajó la lista (si no y no hay red:
 * "Conectate una vez…"). notificationsEnabled arranca en true para que el cartel no parpadee antes de leer el permiso.
 */
data class NotificationsUiState(
    val groups: List<Pair<NotificationGroup, List<AppNotification>>> = emptyList(),
    val hasUnread: Boolean = false,
    val now: Instant = Instant.EPOCH,
    val isOffline: Boolean = false,
    val isRefreshing: Boolean = false,
    val refreshFailed: Boolean = false,
    val everLoaded: Boolean = false,
    val hasMore: Boolean = false,
    val notificationsEnabled: Boolean = true,
)

sealed interface NotificationsEvent {
    /** El alumno tocó un aviso: ya quedó leído; la pantalla decide a dónde ir. */
    data class Open(val destination: NotificationDestination) : NotificationsEvent
}
