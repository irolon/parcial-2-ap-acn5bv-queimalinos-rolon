package com.fittrainer.ui.routines.trainer.ai.assign

import com.fittrainer.data.trainerai.AiSavedTemplate
import kotlinx.serialization.Serializable

/**
 * Por dónde va "Guardar y asignar" (E15). Vive en el SavedStateHandle: si Android mata el proceso, "Reintentar"
 * sigue desde acá sin volver a guardar ni duplicar rutinas.
 * - existingIds: las rutinas que el alumno tenía antes (para reconocer una creada cuya respuesta se perdió).
 * - assigned: el id de la rutina de cada bloque, o null si falta. attempted: bloques cuyo POST ya salió alguna vez.
 */
@Serializable
data class AiAssignProgress(
    val studentId: String,
    val templateName: String,
    val deactivateIds: List<String>,
    val existingIds: List<String>,
    val templates: List<AiSavedTemplate>? = null,
    val assigned: List<String?> = emptyList(),
    val attempted: Set<Int> = emptySet(),
    val done: Boolean = false,
)

data class AiAssignState(
    val running: Boolean = false,
    val assigned: Int = 0,
    val total: Int = 0,
    val message: String? = null,
    val canRetry: Boolean = false,
)

/** Fallas que no se arreglan reintentando: vuelve al formulario. */
enum class AiAssignStop { GENERATION_GONE, EXERCISES_UNAVAILABLE }

data class AiAssignDone(val warning: String?)

const val AI_SAVE_FAILED = "No pudimos guardar la propuesta. Probá de nuevo."
const val NEEDS_NETWORK_OR_RETRY = "Sin conexión: no se pudo guardar. Probá de nuevo."
const val PROPOSAL_GONE = "La propuesta ya no existe. Generá otra."
const val EXERCISES_GONE = "Un ejercicio dejó de estar disponible. Generá otra."
const val ASSIGN_NOT_RECOVERED = "No se pudo recuperar lo guardado: asigná las plantillas desde «Desde plantilla»."

/** Nombre genérico cuando no se pudo leer cuáles eran las rutinas activas de antes. */
const val PREVIOUS_ROUTINES = "las rutinas anteriores"

fun assignedOf(k: Int, n: Int) = "Se asignaron $k de $n"

fun pauseFailed(names: List<String>) = "Las rutinas se asignaron, pero no se pudo pausar ${names.joinToString(" y ")}"

/** Hay más de una rutina nueva que podría ser la del bloque: no se adopta ninguna ni se vuelve a asignar. */
fun assignUnconfirmed(block: String) = "No se pudo confirmar si «$block» quedó asignada: revisá las rutinas del alumno."
