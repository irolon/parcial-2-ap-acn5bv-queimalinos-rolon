package com.fittrainer.data.notifications.push

import com.fittrainer.data.agenda.student.StudentAppointmentsRepository
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.notifications.MESSAGE_PUSH_TYPE
import com.fittrainer.data.notifications.NotificationType
import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.data.session.Role
import javax.inject.Inject

/**
 * Qué se pone al día en Room cuando llega un push. Un mensaje (#70) no tiene fila en avisos: se refresca su chat
 * (y, al entrenador, la lista de conversaciones con sus globitos). El resto refresca la lista de avisos; uno de
 * turno (tarjeta 16) además pone al día «Mis turnos» del alumno, así se ve el estado nuevo aunque ya esté abierta.
 */
class PushRefresher @Inject constructor(
    private val notifications: NotificationsRepository,
    private val messages: TrainerMessagesRepository,
    private val appointments: StudentAppointmentsRepository,
) {
    suspend fun onPush(user: AuthUser, data: Map<String, String>) {
        if (data["type"] != MESSAGE_PUSH_TYPE) {
            notifications.refresh(user.id)
            if (data["type"] == NotificationType.APPOINTMENT.wire && user.role == Role.STUDENT) appointments.refreshMine(user.id)
            return
        }
        if (user.role == Role.STUDENT) {
            messages.refreshThread(user.id, user.id)
            return
        }
        messages.refreshConversations(user.id)
        data["student_id"]?.takeIf { it.isNotBlank() }?.let { messages.refreshThread(user.id, it) }
    }
}

/** Dónde queda el push en la bandeja: Android identifica cada aviso por el par (tag, id). */
data class PushSlot(val tag: String, val id: Int)

/**
 * Los mensajes de una conversación se pisan entre sí (queda el último), con la app abierta o cerrada. Con la app
 * cerrada el push lo muestra Android con el `android.notification.tag` del backend (`message:<student_id>`, #70) e
 * id 0, así que acá se usa el mismo par. El resto lleva el prefijo `push:` y un id fijo, aparte de los avisos del
 * entrenamiento.
 */
fun pushSlot(data: Map<String, String>, fallback: () -> String): PushSlot {
    val student = data["student_id"]?.takeIf { it.isNotBlank() }
    if (data["type"] == MESSAGE_PUSH_TYPE && student != null) return PushSlot("message:$student", FCM_NOTIFICATION_ID)
    return PushSlot("push:${data["notification_id"] ?: fallback()}", PUSH_NOTIFICATION_ID)
}

/** El id con el que el SDK de FCM publica los push que muestra Android con la app en segundo plano. */
private const val FCM_NOTIFICATION_ID = 0

// Fijo y distinto de los de WorkoutNotifications (1001, 1002); lo que distingue cada push es el tag.
private const val PUSH_NOTIFICATION_ID = 3001
