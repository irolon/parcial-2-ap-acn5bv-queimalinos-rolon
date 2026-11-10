package com.fittrainer.data.api.chat

import com.fittrainer.data.auth.RequiredUser
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Tag

/**
 * Chat IA del alumno (tarjeta 14), con su propio cliente de 20 s (AiChatModule): el backend corta a n8n a los 16 s.
 * POST: 429 CHAT_LIMIT_REACHED (20 por día), 429 CHAT_IN_PROGRESS, 429 RATE_LIMIT_EXCEEDED (Retry-After),
 * 503 AI_UNAVAILABLE, 502 AI_INVALID_RESPONSE, 400 SESSION_FINISHED. Un session_id desconocido se ignora.
 */
interface AiChatApi {
    @POST("chat")
    suspend fun send(@Tag owner: RequiredUser, @Body body: AiChatRequest): AiChatReplyResponse

    /** La conversación del día de Argentina (sin sugerencias) y las consultas que quedan. */
    @GET("chat/today")
    suspend fun today(@Tag owner: RequiredUser): AiChatTodayResponse
}
