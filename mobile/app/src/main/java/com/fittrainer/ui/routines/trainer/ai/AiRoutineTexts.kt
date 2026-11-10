package com.fittrainer.ui.routines.trainer.ai

import com.fittrainer.data.trainerai.TrainerAiError
import com.fittrainer.ui.join.goalLabel
import java.time.LocalDate
import java.time.format.DateTimeFormatter

const val AI_TITLE = "Rutina con IA"
const val AI_WITH_AI = "Con IA ✦"
const val AI_GENERATE = "Generar propuesta"
const val AI_GENERATING = "Armando la rutina… puede tardar hasta 30 s"
const val AI_GENERATE_ANOTHER = "Generar otra"
const val AI_SAVE_ASSIGN = "Guardar y asignar"
const val AI_RATIONALE = "Por qué la armó así"
const val AI_PRIVACY = "No pongas datos personales (nombre, documento, contacto): este texto se le manda a la IA."
const val AI_NEEDS_NETWORK = "Necesitás conexión para usar el asistente."
const val AI_TIMEOUT = "La IA tardó demasiado. Probá de nuevo."
const val AI_UNKNOWN = "Algo salió mal. Probá de nuevo."
const val AI_TOO_MANY = "Hiciste muchas propuestas seguidas."
const val AI_MANUAL = "Armar a mano"
const val AI_DISCARD_TITLE = "¿Descartar la propuesta?"
const val AI_DISCARD_SAVED = "Las plantillas ya se guardaron: las podés asignar desde «Desde plantilla»."
const val AI_DISCARD = "Descartar"
const val AI_KEEP = "Seguir revisando"
const val AI_ASSIGNED = "Rutina asignada: ajustala desde Rutinas"
const val AI_PROFILE_EQUIPMENT = "Del perfil"
const val AI_NO_EQUIPMENT = "Sin cargar"
const val AI_CHANGE = "Cambiar"
const val AI_USE_PROFILE = "Usar el del perfil"
const val AI_TEMPLATE_NAME = "Nombre de la plantilla"
const val AI_NAME_REQUIRED = "Poné un nombre de 1 a 120 caracteres"
const val PICK_GOAL = "Elegí un objetivo"
const val PICK_LEVEL = "Elegí un nivel"

private val DAY_MONTH = DateTimeFormatter.ofPattern("dd/MM")

/** "IA · Ganar fuerza · 09/11". */
fun defaultTemplateName(goal: String?, today: LocalDate) = "IA · ${goalLabel(goal)} · ${today.format(DAY_MONTH)}"

fun blocksNameHint(name: String) = "Con varios bloques, cada plantilla se llama «${name.trim()} · <bloque>»."

fun durationLabel(min: Int) = "$min min"

/** El aviso de una falla al generar; los mensajes del backend se muestran tal cual. */
fun generateMessage(error: TrainerAiError): String = when (error) {
    TrainerAiError.Offline -> AI_NEEDS_NETWORK
    TrainerAiError.Timeout -> AI_TIMEOUT
    is TrainerAiError.TooManyAttempts -> listOfNotNull(
        error.message ?: AI_TOO_MANY,
        error.retryAfterSeconds?.let { "Probá de nuevo en ${(it + 59) / 60} min." } ?: "Probá de nuevo más tarde.",
    ).joinToString(" ")
    is TrainerAiError.Unavailable -> error.message ?: AI_UNKNOWN
    is TrainerAiError.InvalidResponse -> error.message ?: AI_UNKNOWN
    is TrainerAiError.Validation -> error.message ?: AI_UNKNOWN
    else -> AI_UNKNOWN
}
