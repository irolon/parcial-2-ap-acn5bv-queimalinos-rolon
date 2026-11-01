package com.fittrainer.ui.workout.components.muscle

import com.fittrainer.data.workout.WorkoutExercise
import com.fittrainer.ui.components.bodymap.paints
import com.fittrainer.ui.components.exercise.equipmentLabel

/** La tarjeta del músculo solo tiene sentido si el grupo pinta algo en el mapa. */
fun showsMuscleCard(muscleGroup: String?): Boolean = paints(muscleGroup)

/**
 * Con alturas medidas (px): la tarjeta entra si tarjeta + separación + botón principal + separación + acciones
 * de abajo no pasan de [available]. Igualar entra: la pantalla no scrollea, pero tampoco se corta.
 */
fun cardFits(available: Int, card: Int, cta: Int, bottom: Int, gap: Int): Boolean =
    card + gap + cta + gap + bottom <= available

/**
 * Y de las acciones de abajo (px): ancladas al fondo, pero nunca más arriba que el botón principal más la
 * separación. Si no entran, se recortan por abajo (como la columna original) en vez de taparle los toques al botón.
 */
fun bottomActionsY(height: Int, ctaBottom: Int, gap: Int, bottom: Int): Int =
    maxOf(height - bottom, ctaBottom + gap)

/** "Barra · 4 series"; sin equipo "4 series"; "1 serie" en singular. */
fun muscleCardLine(exercise: WorkoutExercise): String {
    val sets = exercise.totalSets
    val series = if (sets == 1) "1 serie" else "$sets series"
    val equipment = equipmentLabel(exercise.equipment)
    return if (equipment.isEmpty()) series else "$equipment · $series"
}
