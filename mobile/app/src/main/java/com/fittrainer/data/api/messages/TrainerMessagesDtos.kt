package com.fittrainer.data.api.messages

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ConversationListResponse(val data: List<ConversationDto> = emptyList())

/** Una conversación del PT: una por alumno activo. lastMessage null = todavía no hay mensajes. */
@Serializable
data class ConversationDto(
    val student: CounterpartDto,
    @SerialName("last_message") val lastMessage: LastMessageDto? = null,
    @SerialName("unread_count") val unreadCount: Int = 0,
)

@Serializable
data class CounterpartDto(
    val id: String,
    val name: String,
    @SerialName("avatar_url") val avatarUrl: String? = null,
)

/** body null con hasImage: el último fue solo una foto. */
@Serializable
data class LastMessageDto(
    val body: String? = null,
    @SerialName("has_image") val hasImage: Boolean = false,
    @SerialName("sender_role") val senderRole: String,
    @SerialName("created_at") val createdAt: String,
)

/**
 * Un mensaje. imageUrl es una URL firmada que vence a la hora; readAt la completa el otro lado. hasImage (#73): el
 * mensaje tiene foto aunque imageUrl venga null (la firma falló); null si el backend todavía no manda el campo.
 */
@Serializable
data class MessageDto(
    val id: String,
    @SerialName("student_id") val studentId: String,
    @SerialName("sender_role") val senderRole: String,
    val body: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("broadcast_id") val broadcastId: String? = null,
    @SerialName("read_at") val readAt: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("has_image") val hasImage: Boolean? = null,
)

/** data en orden cronológico (el más viejo primero). */
@Serializable
data class HistoryResponse(
    val data: List<MessageDto> = emptyList(),
    val meta: HistoryMeta = HistoryMeta(),
    val counterpart: CounterpartDto,
)

/** nextBefore: cursor opaco para la página anterior; null si no hay más. */
@Serializable
data class HistoryMeta(@SerialName("next_before") val nextBefore: String? = null)

@Serializable
data class MessageResponse(val data: MessageDto)

@Serializable
data class SendMessageRequest(val body: String)

@Serializable
data class BroadcastRequest(@SerialName("student_ids") val studentIds: List<String>, val body: String)

@Serializable
data class BroadcastResponse(val data: BroadcastResult)

@Serializable
data class BroadcastResult(@SerialName("broadcast_id") val broadcastId: String, val sent: Int)

@Serializable
data class ReadResponse(val data: ReadResult = ReadResult())

@Serializable
data class ReadResult(val updated: Int = 0)
