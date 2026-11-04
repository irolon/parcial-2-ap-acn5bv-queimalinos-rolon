package com.fittrainer.ui.exercises.trainer.form

import com.fittrainer.data.exercises.trainer.TrainerExercise
import com.fittrainer.ui.components.exercise.EQUIPMENT_ORDER
import com.fittrainer.ui.components.exercise.MUSCLE_ORDER
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

/** Campos del formulario de un ejercicio propio (E10). Las reglas son las de validations/exercises del backend. */
enum class ExerciseFormField { NAME, MUSCLE_GROUP, EQUIPMENT, DESCRIPTION, VIDEO_URL }

const val MAX_DESCRIPTION = 1000
const val MAX_VIDEO_URL = 500

/** Lo que se escribe. muscleGroup y equipment: valores del backend ("chest", "barbell"); null = sin elegir. */
data class ExerciseFormInput(
    val name: String = "",
    val muscleGroup: String? = null,
    val equipment: String? = null,
    val description: String = "",
    val videoUrl: String = "",
)

fun TrainerExercise.toFormInput() = ExerciseFormInput(name, muscleGroup, equipment, description.orEmpty(), videoUrl.orEmpty())

/** Vacío = válido. */
fun ExerciseFormInput.errors(): Map<ExerciseFormField, String> = buildMap {
    if (name.trim().length !in 2..120) put(ExerciseFormField.NAME, "Entre 2 y 120 caracteres")
    if (muscleGroup !in MUSCLE_ORDER) put(ExerciseFormField.MUSCLE_GROUP, "Elegí un grupo muscular")
    if (equipment != null && equipment !in EQUIPMENT_ORDER) put(ExerciseFormField.EQUIPMENT, "Equipo inválido")
    if (description.trim().length > MAX_DESCRIPTION) put(ExerciseFormField.DESCRIPTION, "Hasta $MAX_DESCRIPTION caracteres")
    val url = videoUrl.trim()
    if (url.isNotEmpty() && !isVideoUrl(url)) put(ExerciseFormField.VIDEO_URL, "Un link que empiece con http:// o https://")
}

/** Como isValidVideoUrl del backend: http(s), sin espacios, con algo después del esquema, hasta 500. */
fun isVideoUrl(url: String): Boolean =
    url.length <= MAX_VIDEO_URL && url.none { it.isWhitespace() } &&
        Regex("^https?://[^/\\s]+.*$", RegexOption.IGNORE_CASE).matches(url)

/** Body del POST: los opcionales vacíos no se mandan (el backend los deja en null). */
fun ExerciseFormInput.toCreateBody(): JsonObject = buildJsonObject {
    put("name", JsonPrimitive(name.trim()))
    put("muscle_group", JsonPrimitive(muscleGroup))
    equipment?.let { put("equipment", JsonPrimitive(it)) }
    description.trim().takeIf { it.isNotEmpty() }?.let { put("description", JsonPrimitive(it)) }
    videoUrl.trim().takeIf { it.isNotEmpty() }?.let { put("video_url", JsonPrimitive(it)) }
}

/** PATCH con solo lo que cambió; vaciar un opcional manda null. null si no cambió nada. */
fun ExerciseFormInput.patch(before: TrainerExercise): JsonObject? {
    val body = buildJsonObject {
        val n = name.trim()
        if (n != before.name) put("name", JsonPrimitive(n))
        if (muscleGroup != null && muscleGroup != before.muscleGroup) put("muscle_group", JsonPrimitive(muscleGroup))
        if (equipment != before.equipment) put("equipment", equipment?.let(::JsonPrimitive) ?: JsonNull)
        val d = description.trim().ifEmpty { null }
        if (d != before.description?.trim()?.ifEmpty { null }) put("description", d?.let(::JsonPrimitive) ?: JsonNull)
        val v = videoUrl.trim().ifEmpty { null }
        if (v != before.videoUrl?.trim()?.ifEmpty { null }) put("video_url", v?.let(::JsonPrimitive) ?: JsonNull)
    }
    return body.takeIf { it.isNotEmpty() }
}

fun exerciseFormFieldOf(apiField: String?): ExerciseFormField? = when (apiField) {
    "name" -> ExerciseFormField.NAME
    "muscle_group" -> ExerciseFormField.MUSCLE_GROUP
    "equipment" -> ExerciseFormField.EQUIPMENT
    "description" -> ExerciseFormField.DESCRIPTION
    "video_url" -> ExerciseFormField.VIDEO_URL
    else -> null
}
