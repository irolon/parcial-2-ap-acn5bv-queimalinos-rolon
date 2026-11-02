package com.fittrainer.ui.routines.detail

import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.ui.components.exercise.formatKg
import com.fittrainer.ui.components.exercise.muscleLabel
import com.fittrainer.ui.today.setsReps

/** "4×10 · 60 kg · 90 s · Pecho", sin separadores colgando si falta algo. */
fun detailSubtitle(exercise: RoutineExercise): String = listOf(
    setsReps(exercise),
    exercise.suggestedKg?.let(::formatKg).orEmpty(),
    exercise.restSeconds?.let { "$it s" }.orEmpty(),
    muscleLabel(exercise.muscleGroup),
).filter { it.isNotBlank() }.joinToString(" · ")
