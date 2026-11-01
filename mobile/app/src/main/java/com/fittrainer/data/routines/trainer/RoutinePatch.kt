package com.fittrainer.data.routines.trainer

import com.fittrainer.data.invitation.invite.GOALS
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

/** Días del backend, en orden de la semana. */
val WEEK_DAYS = listOf("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")

enum class RoutineField { NAME, GOAL, DAYS }

/** Nombre, objetivo y días de una rutina (hoja "Editar" y paso 1 del asistente). */
data class RoutineHeaderInput(val name: String = "", val goal: String? = null, val days: Set<String> = emptySet())

fun TrainerRoutineSummary.toHeaderInput() = RoutineHeaderInput(name, goal, days.toSet())

/** Reglas de POST/PATCH /routines: nombre 2-120, objetivo del enum, al menos un día. Vacío = válido. */
fun RoutineHeaderInput.errors(): Map<RoutineField, String> = buildMap {
    if (name.trim().length !in 2..120) put(RoutineField.NAME, "Entre 2 y 120 caracteres")
    if (goal !in GOALS) put(RoutineField.GOAL, "Elegí un objetivo")
    if (days.none { it in WEEK_DAYS }) put(RoutineField.DAYS, "Elegí al menos un día")
}

/** Días elegidos en orden de la semana, sin desconocidos. */
fun RoutineHeaderInput.orderedDays(): List<String> = WEEK_DAYS.filter { it in days }

/** PATCH con solo lo que cambió de nombre, objetivo y días; null si no cambió nada. */
fun headerPatch(before: TrainerRoutineSummary, after: RoutineHeaderInput): JsonObject? {
    val body = buildJsonObject {
        val name = after.name.trim()
        if (name != before.name) put("name", JsonPrimitive(name))
        if (after.goal != null && after.goal != before.goal) put("goal", JsonPrimitive(after.goal))
        val days = after.orderedDays()
        if (days.toSet() != before.days.toSet()) put("days", JsonArray(days.map(::JsonPrimitive)))
    }
    return body.takeIf { it.isNotEmpty() }
}

/** Activar (true) o desactivar (false) una rutina. */
fun routineActivePatch(active: Boolean): JsonObject = buildJsonObject { put("active", JsonPrimitive(active)) }

/** Campo del backend → campo de la cabecera. */
fun routineFieldOf(apiField: String?): RoutineField? = when (apiField) {
    "name" -> RoutineField.NAME
    "goal" -> RoutineField.GOAL
    "days" -> RoutineField.DAYS
    else -> null
}
