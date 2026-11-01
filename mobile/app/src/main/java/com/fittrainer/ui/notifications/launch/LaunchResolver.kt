package com.fittrainer.ui.notifications.launch

import com.fittrainer.data.notifications.LaunchSources
import com.fittrainer.data.notifications.NotificationDestination
import com.fittrainer.data.notifications.PendingLaunch
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.userId
import kotlinx.coroutines.withTimeoutOrNull

/** Cuánto espera un tap en un comentario a que baje el historial antes de caer a Progreso → Historial. */
private const val HISTORY_REFRESH_TIMEOUT_MS = 3_000L

/** A qué pantalla se navega al tocar un aviso (push o lista). [None]: no se navega, la app abre normal. */
sealed interface NavTarget {
    data class HistoryDetail(val sessionId: String) : NavTarget
    data object ProgressHistory : NavTarget
    data class ProgressCharts(val exerciseId: String) : NavTarget
    data object Notifications : NavTarget
    /** Entrenador (E12): la sesión de un alumno (ficha → sesión) y su ficha. */
    data class TrainerSession(val studentId: String, val sessionId: String) : NavTarget
    data class TrainerStudent(val studentId: String) : NavTarget
    data object TrainerNotifications : NavTarget
    data object None : NavTarget
}

/**
 * Reglas de la spec §3.3. Sin sesión, o con un destino que no es del rol logueado (un push viejo de otra cuenta),
 * se descarta sin tocar la API ni Room. Si hay [PendingLaunch.notificationId] se marca leído.
 */
suspend fun resolve(launch: PendingLaunch, session: Session?, sources: LaunchSources): NavTarget {
    val owner = session.userId ?: return NavTarget.None
    val trainer = session is Session.Trainer
    val destination = launch.destination
    if (!fitsRole(destination, trainer)) return NavTarget.None
    launch.notificationId?.let { sources.markRead(owner, it) }
    return when (destination) {
        is NotificationDestination.SessionDetail -> sessionTarget(owner, destination.sessionId, sources)
        is NotificationDestination.ExerciseChart -> NavTarget.ProgressCharts(destination.exerciseId)
        is NotificationDestination.StudentSession -> NavTarget.TrainerSession(destination.studentId, destination.sessionId)
        is NotificationDestination.StudentProfile -> NavTarget.TrainerStudent(destination.studentId)
        NotificationDestination.NotificationsList -> if (trainer) NavTarget.TrainerNotifications else NavTarget.Notifications
    }
}

/** Los destinos del historial propio son del alumno; los de un alumno a cargo, del entrenador. La lista, de los dos. */
private fun fitsRole(destination: NotificationDestination, trainer: Boolean): Boolean = when (destination) {
    is NotificationDestination.SessionDetail, is NotificationDestination.ExerciseChart -> !trainer
    is NotificationDestination.StudentSession, is NotificationDestination.StudentProfile -> trainer
    NotificationDestination.NotificationsList -> true
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
