package com.fittrainer.testing.fakes.chat

import com.fittrainer.data.api.chat.AiChatApi
import com.fittrainer.data.api.chat.AiChatReplyDto
import com.fittrainer.data.api.chat.AiChatReplyResponse
import com.fittrainer.data.api.chat.AiChatRequest
import com.fittrainer.data.api.chat.AiChatSuggestionDto
import com.fittrainer.data.api.chat.AiChatTodayDto
import com.fittrainer.data.api.chat.AiChatTodayMessageDto
import com.fittrainer.data.api.chat.AiChatTodayResponse
import com.fittrainer.data.auth.RequiredUser
import kotlinx.coroutines.CompletableDeferred

fun replyDto(id: String = "r1", text: String = "Probá press", remaining: Int = 19, vararg suggestions: AiChatSuggestionDto) =
    AiChatReplyDto(id, text, suggestions.toList(), remaining)

fun todayMessage(id: String, role: String, content: String, at: String) = AiChatTodayMessageDto(id, role, content, at)

/**
 * API falsa: [errors] se consumen en orden (uno por llamada a send); [gate] frena la respuesta hasta completarse.
 * [todayGate] frena GET /chat/today, que devuelve lo que el servidor tenía cuando llegó el pedido.
 */
class FakeAiChatApi : AiChatApi {
    val sent = mutableListOf<AiChatRequest>()
    val errors = ArrayDeque<Throwable>()
    var reply: AiChatReplyDto = replyDto()
    var today = AiChatTodayDto(emptyList(), 20)
    var todayError: Throwable? = null
    var gate: CompletableDeferred<Unit>? = null
    var todayGate: CompletableDeferred<Unit>? = null

    override suspend fun send(owner: RequiredUser, body: AiChatRequest): AiChatReplyResponse {
        sent += body
        gate?.await()
        errors.removeFirstOrNull()?.let { throw it }
        return AiChatReplyResponse(reply)
    }

    override suspend fun today(owner: RequiredUser): AiChatTodayResponse {
        val snapshot = today
        todayGate?.await()
        todayError?.let { throw it }
        return AiChatTodayResponse(snapshot)
    }
}
