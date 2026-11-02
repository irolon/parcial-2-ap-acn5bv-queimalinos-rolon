package com.fittrainer.data.routines.trainer

import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

/** Campos de la hoja del ejercicio. Las reglas son las del backend (validations/routines). */
enum class ExerciseField { SETS, REPS, REST, KG, TEMPO, NOTES }

const val MAX_TEMPO = 20
const val MAX_NOTES = 500

/** Lo que se escribe en la hoja, tal cual (texto). Por defecto, 3 × 10. */
data class ExerciseInput(
    val sets: String = "3",
    val reps: String = "10",
    val rest: String = "",
    val kg: String = "",
    val tempo: String = "",
    val notes: String = "",
)

/** Valores válidos: series y reps obligatorios, el resto opcional (null = sin valor). */
data class ExerciseValues(
    val sets: Int,
    val reps: Int,
    val restSeconds: Int? = null,
    val suggestedKg: Double? = null,
    val tempo: String? = null,
    val notes: String? = null,
)

sealed interface ExerciseFormResult {
    data class Valid(val values: ExerciseValues) : ExerciseFormResult
    data class Invalid(val errors: Map<ExerciseField, String>) : ExerciseFormResult
}

fun TrainerRoutineExercise.toInput() = ExerciseInput(
    sets = sets?.toString().orEmpty(),
    reps = reps?.toString().orEmpty(),
    rest = restSeconds?.toString().orEmpty(),
    kg = suggestedKg?.let(::kgText).orEmpty(),
    tempo = tempo.orEmpty(),
    notes = notes.orEmpty(),
)

fun ExerciseValues.toInput() = ExerciseInput(
    sets = sets.toString(),
    reps = reps.toString(),
    rest = restSeconds?.toString().orEmpty(),
    kg = suggestedKg?.let(::kgText).orEmpty(),
    tempo = tempo.orEmpty(),
    notes = notes.orEmpty(),
)

/** "42,5" con coma y sin ",0". */
fun kgText(kg: Double): String =
    if (kg % 1.0 == 0.0) kg.toLong().toString() else kg.toString().replace('.', ',')

fun ExerciseInput.validate(): ExerciseFormResult {
    val errors = mutableMapOf<ExerciseField, String>()
    val sets = sets.trim().toIntOrNull()?.takeIf { it > 0 }
    if (sets == null) errors[ExerciseField.SETS] = "Un número entero mayor a 0"
    val reps = reps.trim().toIntOrNull()?.takeIf { it > 0 }
    if (reps == null) errors[ExerciseField.REPS] = "Un número entero mayor a 0"
    val rest = optional(rest) { it.toIntOrNull()?.takeIf { n -> n >= 0 } }
    if (rest is Parsed.Bad) errors[ExerciseField.REST] = "Segundos, un número entero"
    val kg = optional(kg) { it.replace(',', '.').toDoubleOrNull()?.takeIf { n -> n >= 0 && n.isFinite() } }
    if (kg is Parsed.Bad) errors[ExerciseField.KG] = "Un número mayor o igual a 0"
    val tempo = tempo.trim()
    if (tempo.length > MAX_TEMPO) errors[ExerciseField.TEMPO] = "Hasta $MAX_TEMPO caracteres"
    val notes = notes.trim()
    if (notes.length > MAX_NOTES) errors[ExerciseField.NOTES] = "Hasta $MAX_NOTES caracteres"
    if (errors.isNotEmpty() || sets == null || reps == null) return ExerciseFormResult.Invalid(errors)
    return ExerciseFormResult.Valid(
        ExerciseValues(sets, reps, rest.value(), kg.value(), tempo.ifEmpty { null }, notes.ifEmpty { null }),
    )
}

/**
 * Body del PATCH con solo lo que cambió, o null si no cambió nada. Vaciar un opcional manda la
 * clave con null explícito; no tocarlo no manda la clave.
 */
fun exercisePatch(before: TrainerRoutineExercise, after: ExerciseValues): JsonObject? {
    val body = buildJsonObject {
        if (after.sets != before.sets) put("sets", JsonPrimitive(after.sets))
        if (after.reps != before.reps) put("reps", JsonPrimitive(after.reps))
        if (after.restSeconds != before.restSeconds) put("rest_seconds", after.restSeconds?.let(::JsonPrimitive) ?: JsonNull)
        if (after.suggestedKg != before.suggestedKg) put("suggested_kg", after.suggestedKg?.let(::JsonPrimitive) ?: JsonNull)
        if (after.tempo != before.tempo) put("tempo", after.tempo?.let(::JsonPrimitive) ?: JsonNull)
        if (after.notes != before.notes) put("notes", after.notes?.let(::JsonPrimitive) ?: JsonNull)
    }
    return body.takeIf { it.isNotEmpty() }
}

/** Campo del backend (details[].field, también "exercises[0].sets") → campo de la hoja. */
fun exerciseFieldOf(apiField: String?): ExerciseField? = when (apiField?.substringAfterLast('.')) {
    "sets" -> ExerciseField.SETS
    "reps" -> ExerciseField.REPS
    "rest_seconds" -> ExerciseField.REST
    "suggested_kg" -> ExerciseField.KG
    "tempo" -> ExerciseField.TEMPO
    "notes" -> ExerciseField.NOTES
    else -> null
}

private sealed interface Parsed<out T> {
    data object Empty : Parsed<Nothing>
    data class Ok<T>(val v: T) : Parsed<T>
    data object Bad : Parsed<Nothing>
}

private fun <T> Parsed<T>.value(): T? = (this as? Parsed.Ok)?.v

private fun <T> optional(text: String, parse: (String) -> T?): Parsed<T> {
    val t = text.trim()
    if (t.isEmpty()) return Parsed.Empty
    return parse(t)?.let { Parsed.Ok(it) } ?: Parsed.Bad
}
