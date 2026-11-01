package com.fittrainer.ui.notifications.launch

import com.fittrainer.data.notifications.LaunchSources
import com.fittrainer.data.notifications.NotificationDestination
import com.fittrainer.data.notifications.PendingLaunch
import com.fittrainer.data.session.Session
import kotlinx.coroutines.withTimeoutOrNull

/** Cuánto espera un tap en un comentario a que baje el historial antes de caer a Progreso → Historial. */
private const val HISTORY_REFRESH_TIMEOUT_MS = 3_000L

/** A qué pantalla se navega al tocar un aviso (push o lista). [None]: no se navega, la app abre normal. */
sealed interface NavTarget {
    data class HistoryDetail(val sessionId: String) : NavTarget
    data object ProgressHistory : NavTarget
    data class ProgressCharts(val exerciseId: String) : NavTarget
    data object Notifications : NavTarget
    data object None : NavTarget
}

/**
 * Reglas de la spec §3.3. Sin sesión de alumno (sin sesión, leyendo o entrenador) el destino se descarta sin
 * tocar la API ni Room. Si hay [PendingLaunch.notificationId] se marca leído.
 */
suspend fun resolve(launch: PendingLaunch, session: Session?, sources: LaunchSources): NavTarget {
    val owner = (session as? Session.Student)?.user?.id ?: return NavTarget.None
    launch.notificationId?.let { sources.markRead(owner, it) }
    return when (val destination = launch.destination) {
        is NotificationDestination.SessionDetail -> sessionTarget(owner, destination.sessionId, sources)
        is NotificationDestination.ExerciseChart -> NavTarget.ProgressCharts(destination.exerciseId)
        NotificationDestination.NotificationsList -> NavTarget.Notifications
    }
}

/**
 * Comentario: si la sesión no está guardada se refresca la página 1 (con red); si no aparece, Progreso → Historial.
 * El refresco tiene tope: con red mala el alumno no se queda mirando Hoy esperando a que navegue.
 */
private suspend fun sessionTarget(owner: String, sessionId: String, sources: LaunchSources): NavTarget {
    if (sources.hasHistorySession(owner, sessionId)) return NavTarget.HistoryDetail(sessionId)
    if (!sources.isOnline()) return NavTarget.ProgressHistory
    withTimeoutOrNull(HISTORY_REFRESH_TIMEOUT_MS) { sources.refreshHistory(owner) } ?: return NavTarget.ProgressHistory
    return if (sources.hasHistorySession(owner, sessionId)) NavTarget.HistoryDetail(sessionId) else NavTarget.ProgressHistory
}
