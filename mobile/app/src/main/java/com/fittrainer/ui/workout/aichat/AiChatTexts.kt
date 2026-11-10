package com.fittrainer.ui.workout.aichat

import com.fittrainer.data.chat.AiChatError

const val AI_TITLE = "Asistente IA"
const val AI_THINKING = "Pensando…"
const val AI_EMPTY_HINT = "Preguntá cómo hacer el ejercicio, con qué reemplazarlo o qué hacer si te molesta algo."
const val AI_OFFLINE = "Necesitás conexión para usar el asistente. Tu sesión sigue guardándose sin red."
const val AI_TIMEOUT = "El asistente tardó demasiado. Seguí con tu entrenamiento y probá de nuevo."
const val AI_DAILY_LIMIT = "Llegaste al límite de consultas de hoy. Mañana podés seguir."
const val AI_IN_PROGRESS = "Esperá la respuesta anterior."
const val AI_UNKNOWN = "No pudimos consultar al asistente. Probá de nuevo."
const val AI_SUGGESTION_MISSING = "Ese ejercicio no está en tu biblioteca. Probá con Reemplazar."
const val AI_REPLACE = "Reemplazar"
const val AI_INPUT_HINT = "Escribí tu pregunta"
const val AI_DICTATE = "Dictar"
const val AI_SEND = "Enviar"

const val CHIP_REPLACE = "¿Con qué lo reemplazo?"
const val CHIP_HOW_TO = "¿Cómo se hace?"
const val CHIP_PAIN = "Me duele…"

/** Largo máximo de una consulta (el backend acepta 1-500). */
const val MAX_MESSAGE_LENGTH = 500

/** Desde cuántas consultas restantes se muestra el contador. */
const val LOW_REMAINING = 5

/** Dónde queda el cursor en [painTemplate]: entre "Me duele " y " al hacer". */
const val PAIN_CURSOR = 9

fun painTemplate(exerciseName: String) = "Me duele  al hacer $exerciseName"

fun remainingText(n: Int) = if (n == 1) "Te queda 1 consulta hoy" else "Te quedan $n consultas hoy"

fun aiChatErrorText(error: AiChatError): String = when (error) {
    AiChatError.Offline -> AI_OFFLINE
    AiChatError.Timeout -> AI_TIMEOUT
    AiChatError.DailyLimit -> AI_DAILY_LIMIT
    AiChatError.InProgress -> AI_IN_PROGRESS
    // Menos de un minuto no se redondea a "1 min" (revisión de Pablo en la #96).
    is AiChatError.TooManyAttempts -> "Hiciste muchas consultas seguidas. Probá de nuevo " + when (val s = error.retryAfterSeconds) {
        null -> "más tarde."
        in 0L until 60L -> "en unos segundos."
        else -> "en ${(s + 59) / 60} min."
    }
    is AiChatError.Unavailable -> error.message
    AiChatError.Unknown -> AI_UNKNOWN
}
