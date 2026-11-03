package com.fittrainer.data.templates.trainer

import java.time.Instant

/** Plantilla del entrenador, como sale en la lista. */
data class TemplateSummary(
    val id: String,
    val name: String,
    val goal: String?,
    val level: String?,
    /** Días del backend (monday … sunday), tal como están en la structure. */
    val days: List<String>,
    val exerciseCount: Int,
    val createdAt: Instant?,
)

/** Un ejercicio de la plantilla. available = false si el ejercicio ya no existe (asignarla da 409). */
data class TemplateExercise(
    val exerciseId: String,
    val name: String,
    val muscleGroup: String?,
    val sets: Int?,
    val reps: Int?,
    val restSeconds: Int?,
    val suggestedKg: Double?,
    val available: Boolean,
)

data class TemplateDetail(val summary: TemplateSummary, val exercises: List<TemplateExercise>)

/** Lista de plantillas y cuándo se bajó. */
data class TemplatesCache(val templates: List<TemplateSummary>, val fetchedAt: Instant)

/** El backend no dejó asignar la plantilla (409): plantilla incompleta o con ejercicios que ya no existen. */
class TemplateRejectedException(val messageText: String) : Exception(messageText)
