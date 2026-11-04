package com.fittrainer.data.notifications.push

import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.notifications.MESSAGE_PUSH_TYPE
import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.data.session.Role
import javax.inject.Inject

/**
 * Qué se pone al día en Room cuando llega un push. Un mensaje (#70) no tiene fila en avisos: se refresca su chat
 * (y, al entrenador, la lista de conversaciones con sus globitos). El resto refresca la lista de avisos.
 */
class PushRefresher @Inject constructor(
    private val notifications: NotificationsRepository,
    private val messages: TrainerMessagesRepository,
) {
    suspend fun onPush(user: AuthUser, data: Map<String, String>) {
        if (data["type"] != MESSAGE_PUSH_TYPE) {
            notifications.refresh(user.id)
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

/**
 * Tag de la notificación en la bandeja: los mensajes de una conversación se pisan entre sí (queda el último). Solo en
 * primer plano: en segundo plano el push trae `notification` y lo muestra Android sin pasar por acá.
 */
fun pushTag(data: Map<String, String>, fallback: () -> String): String {
    val student = data["student_id"]?.takeIf { it.isNotBlank() }
    return when {
        data["type"] == MESSAGE_PUSH_TYPE && student != null -> "message:$student"
        else -> data["notification_id"] ?: fallback()
    }
}
