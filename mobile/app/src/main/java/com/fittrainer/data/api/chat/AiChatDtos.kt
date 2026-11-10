package com.fittrainer.data.api.chat

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Body de POST /chat. Los null no viajan (el Json de la app no codifica los valores por defecto). */
@Serializable
data class AiChatRequest(
    val message: String,
    @SerialName("session_id") val sessionId: String? = null,
    @SerialName("current_exercise_id") val currentExerciseId: String? = null,
)

/** Un ejercicio de la biblioteca que la IA propone como reemplazo (el nombre sale de la biblioteca, no de la IA). */
@Serializable
data class AiChatSuggestionDto(
    @SerialName("exercise_id") val exerciseId: String,
    val name: String,
    val reason: String,
)

@Serializable
data class AiChatReplyDto(
    @SerialName("message_id") val messageId: String,
    val response: String,
    val suggestions: List<AiChatSuggestionDto> = emptyList(),
    @SerialName("remaining_today") val remainingToday: Int,
)

@Serializable
data class AiChatReplyResponse(val data: AiChatReplyDto)

/** role: user | assistant. created_at: ISO con Z o con offset. */
@Serializable
data class AiChatTodayMessageDto(
    val id: String,
    val role: String,
    val content: String,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
data class AiChatTodayDto(
    val messages: List<AiChatTodayMessageDto> = emptyList(),
    @SerialName("remaining_today") val remainingToday: Int,
)

@Serializable
data class AiChatTodayResponse(val data: AiChatTodayDto)
