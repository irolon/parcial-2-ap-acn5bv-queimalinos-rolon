package com.fittrainer.data.chat

import com.fittrainer.data.agenda.isoMillis
import com.fittrainer.data.api.chat.AiChatReplyDto
import com.fittrainer.data.api.chat.AiChatRequest
import com.fittrainer.data.api.chat.AiChatSuggestionDto
import com.fittrainer.data.api.chat.AiChatTodayMessageDto
import com.fittrainer.data.db.chat.AiChatMessageEntity
import com.fittrainer.data.db.chat.ROLE_ASSISTANT
import com.fittrainer.data.db.chat.ROLE_USER
import java.time.Instant
import java.util.UUID
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val json = Json { ignoreUnknownKeys = true }

/** La pregunta recién enviada: el POST no devuelve su id, el próximo refresh la cambia por la del servidor. */
internal fun userEntity(ownerId: String, content: String, at: Long) =
    AiChatMessageEntity(ownerId, "local-${UUID.randomUUID()}", ROLE_USER, content, at, null)

/** La respuesta, con la sesión y el ejercicio del pedido que salió bien. */
internal fun AiChatReplyDto.toEntity(ownerId: String, at: Long, asked: AiChatRequest) = AiChatMessageEntity(
    ownerId, messageId, ROLE_ASSISTANT, response, at,
    suggestions.takeIf { it.isNotEmpty() }?.let { json.encodeToString(it) },
    asked.sessionId, asked.currentExerciseId,
)

/** [kept]: lo que ya tenía Room para este id (GET /chat/today no trae sugerencias ni con qué se preguntó). */
internal fun AiChatTodayMessageDto.toEntity(ownerId: String, kept: AiChatMessageEntity?) = AiChatMessageEntity(
    ownerId, id, role, content, isoMillis(createdAt), kept?.suggestionsJson, kept?.askedSessionId, kept?.askedExerciseId,
)

internal fun AiChatMessageEntity.toDomain() = AiChatMessage(
    id = id,
    fromUser = role == ROLE_USER,
    content = content,
    createdAt = Instant.ofEpochMilli(createdAt),
    suggestions = suggestionsJson
        ?.let { runCatching { json.decodeFromString<List<AiChatSuggestionDto>>(it) }.getOrNull() }
        .orEmpty()
        .map { AiChatSuggestion(it.exerciseId, it.name, it.reason) },
    askedSessionId = askedSessionId,
    askedExerciseId = askedExerciseId,
)
