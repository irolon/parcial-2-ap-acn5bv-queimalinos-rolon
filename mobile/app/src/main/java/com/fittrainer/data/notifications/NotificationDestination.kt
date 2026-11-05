package com.fittrainer.data.notifications

import com.fittrainer.data.session.Role
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

/** A dónde lleva tocar un aviso (de la lista o de un push). */
sealed interface NotificationDestination {
    data class SessionDetail(val sessionId: String) : NotificationDestination
    data class ExerciseChart(val exerciseId: String) : NotificationDestination
    /** Entrenador (E12): una sesión de un alumno suyo. */
    data class StudentSession(val studentId: String, val sessionId: String) : NotificationDestination
    /** Entrenador (E12): la ficha de un alumno suyo. */
    data class StudentProfile(val studentId: String) : NotificationDestination
    /** Tarjeta 18: la conversación con [studentId] (el alumno es él mismo; el entrenador, uno de los suyos). */
    data class Conversation(val studentId: String) : NotificationDestination
    /** Entrenador (E13): la agenda en la semana actual (el aviso solo trae appointment_id). */
    data object Agenda : NotificationDestination
    data object NotificationsList : NotificationDestination
}

/** Push de mensaje nuevo (#70): solo push, nunca está en la lista de avisos. Trae el alumno de la conversación. */
const val MESSAGE_PUSH_TYPE = "message"

/**
 * Resuelve el destino con el `data` del aviso. Si falta algo o viene roto, abre la lista: nunca crashea.
 * [role] decide los tipos que comparten nombre (`pr`, `achievement`). Los push del entrenador (`inactivity`,
 * `routine_modified`) son tipos que el alumno nunca recibe: el intent de un push se resuelve sin saber el rol.
 * `appointment` lleva al PT a su agenda; el alumno se queda en la lista (sus turnos son la tarjeta 16). Su push solo
 * le llega al alumno, así que el default sin rol es la lista.
 */
fun destinationOf(type: String?, data: Map<String, String>, role: Role = Role.STUDENT): NotificationDestination = when (type) {
    NotificationType.COMMENT.wire -> data.text("session_id")?.let { NotificationDestination.SessionDetail(it) }
    NotificationType.PR.wire ->
        if (role == Role.TRAINER) studentSession(data)
        else firstExerciseId(data["exercise_ids"])?.let { NotificationDestination.ExerciseChart(it) }
    NotificationType.ACHIEVEMENT.wire -> if (role == Role.TRAINER) studentProfile(data) else null
    NotificationType.ROUTINE_MODIFIED.wire -> studentSession(data)
    NotificationType.INACTIVITY.wire -> studentProfile(data)
    NotificationType.APPOINTMENT.wire -> if (role == Role.TRAINER) NotificationDestination.Agenda else null
    MESSAGE_PUSH_TYPE -> data.text("student_id")?.let { NotificationDestination.Conversation(it) }
    else -> null
} ?: NotificationDestination.NotificationsList

private fun Map<String, String>.text(key: String): String? = this[key]?.takeIf { it.isNotBlank() }

private fun studentSession(data: Map<String, String>): NotificationDestination? {
    val student = data.text("student_id") ?: return null
    val session = data.text("session_id") ?: return null
    return NotificationDestination.StudentSession(student, session)
}

private fun studentProfile(data: Map<String, String>): NotificationDestination? =
    data.text("student_id")?.let { NotificationDestination.StudentProfile(it) }

/** `exercise_ids` llega como JSON serializado en texto; se toma el primer elemento si es un texto no vacío. */
private fun firstExerciseId(raw: String?): String? {
    if (raw == null) return null
    val array = runCatching { Json.parseToJsonElement(raw) }.getOrNull() as? JsonArray ?: return null
    val first = array.firstOrNull() as? JsonPrimitive ?: return null
    return if (first.isString) first.contentOrNull?.takeIf { it.isNotBlank() } else null
}
