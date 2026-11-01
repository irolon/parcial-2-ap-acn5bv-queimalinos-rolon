package com.fittrainer.data.notifications

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

/** A dónde lleva tocar un aviso (de la lista o de un push). */
sealed interface NotificationDestination {
    data class SessionDetail(val sessionId: String) : NotificationDestination
    data class ExerciseChart(val exerciseId: String) : NotificationDestination
    data object NotificationsList : NotificationDestination
}

/** Resuelve el destino con el `data` del aviso. Si falta algo o viene roto, abre la lista: nunca crashea. */
fun destinationOf(type: String?, data: Map<String, String>): NotificationDestination = when (type) {
    NotificationType.COMMENT.wire -> data["session_id"]?.takeIf { it.isNotBlank() }
        ?.let { NotificationDestination.SessionDetail(it) }
    NotificationType.PR.wire -> firstExerciseId(data["exercise_ids"])
        ?.let { NotificationDestination.ExerciseChart(it) }
    else -> null
} ?: NotificationDestination.NotificationsList

/** `exercise_ids` llega como JSON serializado en texto; se toma el primer elemento si es un texto no vacío. */
private fun firstExerciseId(raw: String?): String? {
    if (raw == null) return null
    val array = runCatching { Json.parseToJsonElement(raw) }.getOrNull() as? JsonArray ?: return null
    val first = array.firstOrNull() as? JsonPrimitive ?: return null
    return if (first.isString) first.contentOrNull?.takeIf { it.isNotBlank() } else null
}
