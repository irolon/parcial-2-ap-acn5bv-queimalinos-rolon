package com.fittrainer.data.trainerai

import kotlinx.serialization.Serializable

/** Un ejercicio de la propuesta, con el nombre de la biblioteca. Serializable: vive en el SavedStateHandle. */
@Serializable
data class AiProposalExercise(
    val exerciseId: String,
    val name: String,
    val sets: Int,
    val reps: Int,
    val restSeconds: Int,
    val suggestedKg: Double? = null,
    val notes: String? = null,
)

/** Un bloque: una rutina con sus días (en orden de la semana). Los bloques no repiten días. */
@Serializable
data class AiProposalBlock(val name: String, val days: List<String>, val exercises: List<AiProposalExercise>)

/** La propuesta de la IA (E15). Solo se puede guardar entera: save-as-template recibe el generationId. */
@Serializable
data class AiRoutineProposal(val generationId: String, val blocks: List<AiProposalBlock>, val rationale: String)

/** Una plantilla que creó save-as-template, en el orden de los bloques. */
@Serializable
data class AiSavedTemplate(val id: String, val name: String)

/**
 * Lo que pide el entrenador. equipment null = el de la ficha (no viaja); vacío = solo peso corporal.
 * injuries null = las de la ficha (no viaja: la ficha no cargó y el PT no escribió nada); en blanco = "sin lesiones".
 */
data class AiRoutineParams(
    val studentId: String,
    val goal: String,
    val level: String,
    val frequencyPerWeek: Int,
    val sessionDurationMin: Int,
    val equipment: List<String>?,
    val injuries: String?,
    val preferences: String?,
)

const val MAX_TEMPLATE_NAME = 120

/** El nombre que le pone el backend a la plantilla de un bloque (templateNameFor de ai-generation.model.js). */
fun aiTemplateName(templateName: String, blockName: String, blockCount: Int): String =
    if (blockCount == 1) templateName else "$templateName · $blockName".take(MAX_TEMPLATE_NAME)
