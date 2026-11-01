package com.fittrainer.ui.progress.charts

/** Qué muestra cada sección según el estado (spec §3.4). Función pura: los composables solo despachan. */
enum class ChartsContent { NO_EXERCISES, LOADING, NEVER_LOADED, LOAD_FAILED, NO_DATA, NO_BODY, EMPTY_PERIOD, ONE_POINT, CHART }

object ChartsEmptyState {
    fun exercises(s: ChartsUiState): ChartsContent = when {
        !s.exercisesLoaded -> ChartsContent.LOADING
        // Lista nunca bajada: no se sabe si entrenó (el historial del celular no alcanza), así que nada de "Terminá tu primera sesión".
        !s.exercisesEverLoaded -> neverLoaded(s.listRefreshing, s.listRefreshAttempted, s.isOffline)
        s.exercises.isEmpty() -> ChartsContent.NO_EXERCISES
        !s.exerciseEverLoaded -> neverLoaded(s.isRefreshing, s.refreshAttempted, s.isOffline)
        s.totalExerciseDays == 0 -> ChartsContent.NO_DATA
        s.exerciseSeries.isEmpty() -> ChartsContent.EMPTY_PERIOD
        // Por días entrenados (§3.4), no por puntos de la métrica: si la métrica tiene pocos, se dibuja lo que hay.
        s.totalExerciseDays == 1 -> ChartsContent.ONE_POINT
        else -> ChartsContent.CHART
    }

    fun body(s: ChartsUiState): ChartsContent = when {
        !s.bodyEverLoaded -> neverLoaded(s.isRefreshing, s.refreshAttempted, s.isOffline)
        s.bodyFields.isEmpty() -> ChartsContent.NO_BODY
        s.bodySeries.isEmpty() -> ChartsContent.EMPTY_PERIOD
        else -> ChartsContent.CHART
    }

    /**
     * Nunca bajado: carga mientras corre o antes del primer intento. Después, sin red → "Conectate una vez"; con red →
     * falla con Reintentar en la sección (no depende del banner, que se puede cerrar).
     */
    private fun neverLoaded(running: Boolean, attempted: Boolean, offline: Boolean): ChartsContent = when {
        running || !attempted -> ChartsContent.LOADING
        offline -> ChartsContent.NEVER_LOADED
        else -> ChartsContent.LOAD_FAILED
    }
}
