package com.fittrainer.ui.workout

import com.fittrainer.data.library.LibraryCache
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutExercise
import com.fittrainer.data.workout.WorkoutSummary
import com.fittrainer.data.workout.exercise
import com.fittrainer.data.workout.setAt

/**
 * workout: la sesión abierta leída de Room (null: no hay). load: lo que el alumno está ajustando de
 * la serie en pantalla. editingSet: una serie ya hecha que eligió corregir (null: la del cursor).
 */
data class WorkoutUiState(
    val loaded: Boolean = false,
    val workout: Workout? = null,
    val load: Load = Load(0.0, 0),
    val editingSet: Int? = null,
    /** Hay un cierre en curso: no cerrar la pantalla aunque la sesión ya no esté abierta. */
    val ending: Boolean = false,
    val summary: WorkoutSummary? = null,
    val error: String? = null,
    val isOffline: Boolean = false,
    val library: LibraryCache = LibraryCache(emptyList(), null),
) {
    val exercise: WorkoutExercise? get() = workout?.let { it.exercise(it.cursor.position) }

    /** Serie que muestran los números grandes y que guarda el CTA. */
    val shownSet: Int get() = editingSet ?: workout?.cursor?.setNumber ?: 1

    /** La serie en pantalla ya está registrada: el CTA la corrige. */
    val isCorrecting: Boolean get() = workout?.let { it.setAt(it.cursor.position, shownSet) != null } == true

    /** Se muestra el timer (salvo que el alumno esté corrigiendo una serie). */
    val isResting: Boolean get() = workout?.rest != null && editingSet == null

    /** No hay sesión (se descartó o se terminó sin series): la pantalla vuelve a Hoy. */
    val closed: Boolean get() = loaded && workout == null && summary == null && !ending
}
