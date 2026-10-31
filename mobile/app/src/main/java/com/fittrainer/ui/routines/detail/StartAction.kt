package com.fittrainer.ui.routines.detail

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.data.workout.Workout
import com.fittrainer.ui.components.exercise.formatKg
import com.fittrainer.ui.components.exercise.muscleLabel
import com.fittrainer.ui.today.setsReps

/** Qué ofrece la barra de abajo del detalle de una rutina. */
sealed interface StartAction {
    data object Start : StartAction
    data object Continue : StartAction

    /** Hay una sesión abierta de otra rutina: una sola a la vez, se termina desde la sesión. */
    data class Blocked(val otherRoutineName: String) : StartAction

    /** El repositorio no deja arrancar una rutina vacía. */
    data object NoExercises : StartAction
}

/**
 * La sesión abierta manda: si es de esta rutina se continúa (aunque la rutina haya cambiado), si es de otra
 * (o de una rutina que ya no existe, routineId nulo) se bloquea. Recién sin sesión se mira si hay ejercicios.
 */
fun startAction(routine: Routine, active: Workout?): StartAction = when {
    active != null && active.routineId == routine.id -> StartAction.Continue
    active != null -> StartAction.Blocked(active.routineName)
    routine.exercises.isEmpty() -> StartAction.NoExercises
    else -> StartAction.Start
}

/** "4×10 · 60 kg · 90 s · Pecho", sin separadores colgando si falta algo. */
fun detailSubtitle(exercise: RoutineExercise): String = listOf(
    setsReps(exercise),
    exercise.suggestedKg?.let(::formatKg).orEmpty(),
    exercise.restSeconds?.let { "$it s" }.orEmpty(),
    muscleLabel(exercise.muscleGroup),
).filter { it.isNotBlank() }.joinToString(" · ")
