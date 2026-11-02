package com.fittrainer.data.students.detail

import com.fittrainer.data.invitation.invite.GOALS
import com.fittrainer.data.invitation.invite.LEVELS
import com.fittrainer.data.invitation.invite.MAX_EQUIPMENT
import com.fittrainer.data.invitation.invite.MAX_EQUIPMENT_LENGTH
import com.fittrainer.data.invitation.invite.MAX_INJURIES
import java.time.LocalDate
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

/** Campos editables de la ficha (los mismos del PATCH, salvo active). */
enum class EditField { NAME, GOAL, LEVEL, BIRTH_DATE, EQUIPMENT, INJURIES }

/** Lo que se edita. goal y level no se pueden borrar (el backend solo acepta valores del enum). */
data class EditableStudent(
    val name: String,
    val goal: String?,
    val level: String?,
    val birthDate: LocalDate?,
    val equipment: List<String>,
    val injuries: String,
)

fun StudentDetail.toEditable() = EditableStudent(name, goal, level, birthDate, gymEquipment, injuries.orEmpty())

/** Reglas del PATCH (docs/arquitectura/contratos-api.md). Vacío = válido. */
fun EditableStudent.errors(today: LocalDate): Map<EditField, String> = buildMap {
    if (name.trim().length !in 2..100) put(EditField.NAME, "Entre 2 y 100 caracteres")
    if (goal != null && goal !in GOALS) put(EditField.GOAL, "Objetivo inválido")
    if (level != null && level !in LEVELS) put(EditField.LEVEL, "Nivel inválido")
    if (birthDate != null && birthDate.isAfter(today)) put(EditField.BIRTH_DATE, "No puede ser una fecha futura")
    val items = equipment.map { it.trim() }
    if (items.size > MAX_EQUIPMENT) put(EditField.EQUIPMENT, "Hasta $MAX_EQUIPMENT elementos")
    else if (items.any { it.length !in 1..MAX_EQUIPMENT_LENGTH }) put(EditField.EQUIPMENT, "Cada elemento de 1 a $MAX_EQUIPMENT_LENGTH caracteres")
    if (injuries.trim().length > MAX_INJURIES) put(EditField.INJURIES, "Hasta $MAX_INJURIES caracteres")
}

/**
 * Body del PATCH con solo lo que cambió, o null si no cambió nada. Las claves que no se tocaron no
 * van; borrar (fecha, equipamiento o lesiones vacíos) manda la clave con null explícito.
 */
fun diffPatch(before: StudentDetail, after: EditableStudent): JsonObject? {
    val body = buildJsonObject {
        val name = after.name.trim()
        if (name != before.name) put("name", JsonPrimitive(name))
        if (after.goal != null && after.goal != before.goal) put("goal", JsonPrimitive(after.goal))
        if (after.level != null && after.level != before.level) put("level", JsonPrimitive(after.level))
        if (after.birthDate != before.birthDate) put("birth_date", after.birthDate?.let { JsonPrimitive(it.toString()) } ?: JsonNull)
        val equipment = after.equipment.map { it.trim() }.filter { it.isNotEmpty() }
        if (equipment != before.gymEquipment) {
            put("gym_equipment", if (equipment.isEmpty()) JsonNull else JsonArray(equipment.map(::JsonPrimitive)))
        }
        val injuries = after.injuries.trim().ifEmpty { null }
        if (injuries != before.injuries?.trim()?.ifEmpty { null }) put("injuries", injuries?.let(::JsonPrimitive) ?: JsonNull)
    }
    return body.takeIf { it.isNotEmpty() }
}

/** Baja (false) o reactivación (true). */
fun activePatch(active: Boolean): JsonObject = buildJsonObject { put("active", JsonPrimitive(active)) }

/** Campo del backend (details[].field) → campo de la edición. */
fun editFieldOf(apiField: String?): EditField? = when (apiField) {
    "name" -> EditField.NAME
    "goal" -> EditField.GOAL
    "level" -> EditField.LEVEL
    "birth_date" -> EditField.BIRTH_DATE
    "gym_equipment" -> EditField.EQUIPMENT
    "injuries" -> EditField.INJURIES
    else -> null
}
