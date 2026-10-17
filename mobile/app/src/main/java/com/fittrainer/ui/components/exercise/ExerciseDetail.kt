package com.fittrainer.ui.components.exercise

/**
 * Lo que muestra la hoja de detalle. La prescripción (series, reps, nota…) solo viene de Hoy;
 * la descripción, de la biblioteca. Lo que es null no se muestra.
 */
data class ExerciseDetail(
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val videoUrl: String?,
    val description: String? = null,
    val sets: Int? = null,
    val reps: Int? = null,
    val suggestedKg: Double? = null,
    val tempo: String? = null,
    val restSeconds: Int? = null,
    val notes: String? = null,
)
