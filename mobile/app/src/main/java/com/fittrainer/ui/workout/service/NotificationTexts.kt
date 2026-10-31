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

/** Patrón del canal "Fin del descanso"; el aviso de adentro de la app vibra igual para que se sienta lo mismo. */
val REST_DONE_VIBRATION: LongArray = longArrayOf(0, 400, 200, 400)
