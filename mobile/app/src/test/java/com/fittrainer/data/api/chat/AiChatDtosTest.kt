package com.fittrainer.data.api.chat

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Test

/** Tarjeta 14: el contrato de POST /chat y GET /chat/today (backend de la #90). */
class AiChatDtosTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test fun `el pedido omite session_id y current_exercise_id cuando son null`() {
        assertEquals("""{"message":"hola"}""", json.encodeToString(AiChatRequest("hola")))
        assertEquals(
            """{"message":"hola","session_id":"s1","current_exercise_id":"e1"}""",
            json.encodeToString(AiChatRequest("hola", "s1", "e1")),
        )
    }

    @Test fun `la respuesta trae sugerencias y lo que queda hoy`() {
        val raw = """{"data":{"message_id":"m1","response":"Probá press","suggestions":[{"exercise_id":"e2","name":"Press","reason":"Mismo músculo"}],"remaining_today":19,"extra":1}}"""
        val reply = json.decodeFromString<AiChatReplyResponse>(raw).data
        assertEquals("m1", reply.messageId)
        assertEquals(listOf(AiChatSuggestionDto("e2", "Press", "Mismo músculo")), reply.suggestions)
        assertEquals(19, reply.remainingToday)
    }

    @Test fun `la conversacion del dia sin sugerencias`() {
        val raw = """{"data":{"messages":[{"id":"a","role":"user","content":"hola","created_at":"2026-11-09T15:00:00.123+00:00"}],"remaining_today":20}}"""
        val today = json.decodeFromString<AiChatTodayResponse>(raw).data
        assertEquals("user", today.messages.single().role)
        assertEquals("2026-11-09T15:00:00.123+00:00", today.messages.single().createdAt)
    }
}
