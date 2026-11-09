package com.fittrainer.ui.workout.aichat

import com.fittrainer.data.chat.AiChatMessage
import java.time.LocalDate

/** Lo que la hoja necesita de la sesión: a qué sesión y ejercicio se refiere la consulta. */
data class AiChatTarget(val sessionId: String?, val exerciseId: String?, val exerciseName: String)

/** remaining: consultas que quedan hoy (null = todavía no se sabe). notice: el error del último intento. */
data class AiChatUiState(
    val messages: List<AiChatMessage> = emptyList(),
    val offline: Boolean = false,
    val sending: Boolean = false,
    val remaining: Int? = null,
    val notice: String? = null,
    /** El día de Argentina que muestra la hoja (null: todavía no se leyó Room). */
    val day: LocalDate? = null,
) {
    val limitReached: Boolean get() = remaining == 0
    val canAsk: Boolean get() = !offline && !sending && !limitReached
    fun canSend(draft: String) = canAsk && draft.isNotBlank()

    /** El aviso sobre la caja: sin red y el tope ganan sobre el error del último intento. */
    val banner: String? get() = when {
        offline -> AI_OFFLINE
        limitReached -> AI_DAILY_LIMIT
        else -> notice
    }

    val remainingLabel: String? get() = remaining?.takeIf { it in 1..LOW_REMAINING }?.let { remainingText(it) }
}
