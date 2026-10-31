package com.fittrainer.ui.routines.detail

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineCache
import com.fittrainer.data.workout.Workout

sealed interface RoutineDetailContent {
    data class Loaded(val routine: Routine, val action: StartAction) : RoutineDetailContent

    /** No está en el caché: el entrenador la desactivó (o nunca estuvo). */
    data object Missing : RoutineDetailContent
}

/** content == null: todavía no se leyó Room. error: no se pudo abrir la sesión. */
data class RoutineDetailUiState(
    val content: RoutineDetailContent? = null,
    val isOffline: Boolean = false,
    val error: String? = null,
)

fun detailContent(cache: RoutineCache, routineId: String, active: Workout?): RoutineDetailContent =
    cache.routines.firstOrNull { it.id == routineId }
        ?.let { RoutineDetailContent.Loaded(it, startAction(it, active)) }
        ?: RoutineDetailContent.Missing
