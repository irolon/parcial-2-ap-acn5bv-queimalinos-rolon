package com.fittrainer.ui.workout

import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutExercise
import com.fittrainer.data.workout.WorkoutSet
import com.fittrainer.data.workout.WorkoutSummary
import com.fittrainer.data.workout.isLastPending
import java.time.Duration
import java.time.Instant

const val CTA_REST = "Serie completa → descanso"
const val CTA_FINISH = "Serie completa → terminar"
const val CTA_CORRECT = "Guardar corrección"
const val SAVE_FAILED = "No pudimos guardar la serie. Probá de nuevo"
const val REST_SAVE_FAILED = "No pudimos actualizar el descanso. Probá de nuevo"
const val START_FAILED = "No pudimos abrir la sesión. Probá de nuevo"
const val FINISH_FAILED = "No pudimos terminar la sesión. Probá de nuevo"
const val NO_NOTIFICATIONS = "Sin notificaciones no vas a escuchar el fin del descanso con el celular bloqueado"
const val REPLACE_LOCKED = "No se puede reemplazar: ya registraste series de este ejercicio"
const val LIBRARY_NEVER_SYNCED = "Conectate una vez para bajar la biblioteca"

/** 90_000 → "1:30". Redondea para arriba: 0:01 hasta que de verdad llega a 0. */
fun formatClock(ms: Long): String {
    val total = (ms + 999) / 1_000
    return "%d:%02d".format(total / 60, total % 60)
}

/** Cronómetro de la sesión: "22:14" o "1:02:03". */
fun formatElapsed(from: Instant, now: Instant): String {
    val s = Duration.between(from, now).seconds.coerceAtLeast(0)
    return if (s >= 3_600) "%d:%02d:%02d".format(s / 3_600, s % 3_600 / 60, s % 60) else "%d:%02d".format(s / 60, s % 60)
}

/** 65.0 → "65"; 62.5 → "62,5". */
fun kgNumber(kg: Double): String = if (kg % 1.0 == 0.0) kg.toInt().toString() else kg.toString().replace('.', ',')

fun setTabLabel(set: WorkoutSet): String = "${kgNumber(set.kg)}·${set.reps}"

fun loadLine(load: Load): String = "${kgNumber(load.kg)}kg × ${load.reps} reps"

/** Plan del PT; null si la rutina no trae ni peso ni reps. */
fun suggestedChip(e: WorkoutExercise): String? = when {
    e.suggestedKg != null && e.reps != null -> "SUGERIDO · ${kgNumber(e.suggestedKg)}KG × ${e.reps}"
    e.suggestedKg != null -> "SUGERIDO · ${kgNumber(e.suggestedKg)}KG"
    e.reps != null -> "SUGERIDO · ${e.reps} REPS"
    else -> null
}

fun ctaLabel(state: WorkoutUiState): String {
    val w = state.workout ?: return CTA_REST
    return when {
        state.isCorrecting -> CTA_CORRECT
        w.isLastPending(w.cursor) -> CTA_FINISH
        else -> CTA_REST
    }
}

fun missingSetsMessage(n: Int): String =
    if (n == 1) "Te falta 1 serie, ¿terminar igual?" else "Te faltan $n series, ¿terminar igual?"

fun summaryText(s: WorkoutSummary): String = "Sesión terminada · ${s.sets} series · ${s.minutes} min"

fun exerciseCounter(w: Workout): String = "EJERCICIO ${w.cursor.position + 1} / ${w.exercises.size}"
