package com.fittrainer.ui.workout

import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutSet
import com.fittrainer.data.workout.WorkoutSummary
import com.fittrainer.data.workout.exercise
import com.fittrainer.data.workout.lastDoneSet
import com.fittrainer.data.workout.setAt
import java.time.Instant

/** Lo que vive solo en la pantalla de la sesión (lo demás sale de Room). */
internal data class WorkoutLocal(
    val loaded: Boolean = false,
    val load: Load = Load(0.0, 0),
    /** Para qué serie se calculó [load]: si cambia, se vuelve a precargar. */
    val loadKey: LoadKey? = null,
    val editingSet: Int? = null,
    val ending: Boolean = false,
    val summary: WorkoutSummary? = null,
    val error: String? = null,
    /** Hay un confirmar guardándose: otro toque no graba nada hasta que vuelva. */
    val saving: Boolean = false,
)

/**
 * Todo lo que alimenta la precarga de una serie. Incluye las series hechas de ese ejercicio: si Room
 * publica una corrección después de que el VM ya precargó, la clave cambia y se vuelve a precargar.
 */
internal data class LoadKey(
    val workoutId: String,
    val position: Int,
    val setNumber: Int,
    val exerciseId: String,
    val doneAtPosition: Set<WorkoutSet>,
)

internal fun Workout.loadKey(setNumber: Int): LoadKey = LoadKey(
    id, cursor.position, setNumber, exercise(cursor.position).exerciseId,
    sets.filter { it.position == cursor.position }.toSet(),
)

/**
 * Sin descanso no aparece el timer y un doble toque leería el cursor nuevo: se descarta un confirmar de
 * serie nueva que llega a menos de esto de la última serie hecha. Las correcciones no pasan por acá.
 */
internal const val DOUBLE_TAP_WINDOW_MS = 1_500L

internal fun Workout.isDoubleTap(setNumber: Int, now: Instant): Boolean {
    if (setAt(cursor.position, setNumber) != null) return false
    val last = lastDoneSet() ?: return false
    return now.toEpochMilli() - last.executedAt.toEpochMilli() < DOUBLE_TAP_WINDOW_MS
}
