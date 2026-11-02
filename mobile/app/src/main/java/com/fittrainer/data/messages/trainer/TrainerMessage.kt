package com.fittrainer.data.messages.trainer

import java.time.Instant

const val SENDER_TRAINER = "trainer"
const val SENDER_STUDENT = "student"

/** Tope de caracteres de un mensaje (el backend recorta y valida igual). */
const val MAX_MESSAGE_LENGTH = 2000

/** Tope de alumnos de una difusión. */
const val MAX_BROADCAST = 200

/** Lo último de una conversación, para la vista previa de la lista. */
data class LastMessage(val body: String?, val hasImage: Boolean, val fromTrainer: Boolean, val at: Instant)

/** Una conversación con un alumno activo; last null = todavía no hay mensajes. */
data class Conversation(
    val studentId: String,
    val name: String,
    val avatarUrl: String?,
    val last: LastMessage?,
    val unread: Int,
)

data class ConversationsCache(val conversations: List<Conversation>, val fetchedAt: Instant)

/** Un mensaje. read: el otro lado ya lo leyó (para los del PT, el "✓✓"). */
data class Message(
    val id: String,
    val fromTrainer: Boolean,
    val body: String?,
    val imageUrl: String?,
    val broadcast: Boolean,
    val read: Boolean,
    val at: Instant,
)

/** Un chat guardado: hasMore = hay mensajes más viejos para pedir. */
data class ThreadCache(val name: String, val messages: List<Message>, val hasMore: Boolean, val fetchedAt: Instant)

/** 409 STUDENT_INACTIVE: el alumno está dado de baja y no se le puede escribir. */
class StudentInactiveException(message: String) : Exception(message)
