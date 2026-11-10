package com.fittrainer.data.chat

import java.time.Instant
import java.time.LocalDate

/** Un ejercicio de la biblioteca que la IA propone como reemplazo, con su motivo. */
data class AiChatSuggestion(val exerciseId: String, val name: String, val reason: String)

/**
 * Un mensaje del chat IA, tal como lo ve la app (sin Room ni Retrofit). En una respuesta, [askedSessionId] y
 * [askedExerciseId] son la sesión y el ejercicio con que se preguntó (null si no se sabe): sus sugerencias solo
 * reemplazan ese ejercicio en esa sesión.
 */
data class AiChatMessage(
    val id: String,
    val fromUser: Boolean,
    val content: String,
    val createdAt: Instant,
    val suggestions: List<AiChatSuggestion>,
    val askedSessionId: String? = null,
    val askedExerciseId: String? = null,
)

/** La conversación de un día de Argentina. */
data class AiChatToday(val day: LocalDate, val messages: List<AiChatMessage>)

/** Las consultas que quedaban en [day] según el servidor: pasada la medianoche ya no dicen nada del día nuevo. */
data class AiChatQuota(val remaining: Int, val day: LocalDate)
