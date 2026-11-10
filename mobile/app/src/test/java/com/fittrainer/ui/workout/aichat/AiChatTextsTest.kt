package com.fittrainer.ui.workout.aichat

import com.fittrainer.data.chat.AiChatError
import org.junit.Assert.assertEquals
import org.junit.Test

/** Tarjeta 14: los textos del asistente. */
class AiChatTextsTest {
    @Test fun `la plantilla del dolor deja el cursor en el hueco`() {
        val t = painTemplate("Sentadilla")
        assertEquals("Me duele  al hacer Sentadilla", t)
        assertEquals(' ', t[PAIN_CURSOR - 1])
        assertEquals(' ', t[PAIN_CURSOR])
    }

    @Test fun `cada error tiene su texto`() {
        assertEquals(AI_OFFLINE, aiChatErrorText(AiChatError.Offline))
        assertEquals(AI_TIMEOUT, aiChatErrorText(AiChatError.Timeout))
        assertEquals(AI_DAILY_LIMIT, aiChatErrorText(AiChatError.DailyLimit))
        assertEquals(AI_IN_PROGRESS, aiChatErrorText(AiChatError.InProgress))
        assertEquals("Caído", aiChatErrorText(AiChatError.Unavailable("Caído")))
        assertEquals(AI_UNKNOWN, aiChatErrorText(AiChatError.Unknown))
        assertEquals("Hiciste muchas consultas seguidas. Probá de nuevo en 2 min.", aiChatErrorText(AiChatError.TooManyAttempts(61)))
        assertEquals("Hiciste muchas consultas seguidas. Probá de nuevo más tarde.", aiChatErrorText(AiChatError.TooManyAttempts(null)))
    }

    @Test fun `un 429 de pocos segundos no dice un minuto`() {
        assertEquals("Hiciste muchas consultas seguidas. Probá de nuevo en unos segundos.", aiChatErrorText(AiChatError.TooManyAttempts(8)))
        assertEquals("Hiciste muchas consultas seguidas. Probá de nuevo en 1 min.", aiChatErrorText(AiChatError.TooManyAttempts(60)))
    }

    @Test fun `las consultas que quedan`() {
        assertEquals("Te queda 1 consulta hoy", remainingText(1))
        assertEquals("Te quedan 5 consultas hoy", remainingText(5))
    }
}
