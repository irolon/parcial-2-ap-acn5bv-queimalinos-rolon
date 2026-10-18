package com.fittrainer.ui.workout.service

import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.exercise
import com.fittrainer.ui.components.exercise.formatKg

const val REST_DONE_TITLE = "Descanso terminado"

fun ongoingTitle(w: Workout, resting: Boolean): String = if (resting) "Descanso" else "Sesión en curso"

fun ongoingText(w: Workout): String {
    val e = w.exercise(w.cursor.position)
    return "${e.name} · S${w.cursor.setNumber}/${e.totalSets}"
}

fun restDoneText(next: Load): String = "Próxima: ${formatKg(next.kg)} × ${next.reps}"
