package com.fittrainer.data.db.chat

import androidx.room.Entity
import androidx.room.Index

const val ROLE_USER = "user"
const val ROLE_ASSISTANT = "assistant"

/**
 * Un mensaje del chat IA del alumno (tarjeta 14). id: el del servidor; la pregunta recién enviada usa "local-<uuid>"
 * hasta el próximo refresh. createdAt en epoch millis. suggestionsJson: las sugerencias de la respuesta (JSON de
 * AiChatSuggestionDto), solo en respuestas que las trajeron; GET /chat/today no las devuelve.
 */
@Entity(
    tableName = "ai_chat_messages",
    primaryKeys = ["ownerId", "id"],
    indices = [Index(value = ["ownerId", "createdAt"])],
)
data class AiChatMessageEntity(
    val ownerId: String,
    val id: String,
    val role: String,
    val content: String,
    val createdAt: Long,
    val suggestionsJson: String?,
)
