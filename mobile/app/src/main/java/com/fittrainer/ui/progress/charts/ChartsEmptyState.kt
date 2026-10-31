package com.fittrainer.ui.progress.charts

/** Qué muestra cada sección según el estado (spec §3.4). Función pura: los composables solo despachan. */
enum class ChartsContent { NO_EXERCISES, LOADING, NEVER_LOADED, LOAD_FAILED, NO_DATA, NO_BODY, EMPTY_PERIOD, ONE_POINT, CHART }

object ChartsEmptyState {
    fun exercises(s: ChartsUiState): ChartsContent = when {
        !s.exercisesLoaded -> ChartsContent.LOADING
        s.exercises.isEmpty() -> ChartsContent.NO_EXERCISES
        !s.exerciseEverLoaded -> neverLoaded(s)
        s.totalExerciseDays == 0 -> ChartsContent.NO_DATA
        s.exerciseSeries.isEmpty() -> ChartsContent.EMPTY_PERIOD
        // Por días entrenados (§3.4), no por puntos de la métrica: si la métrica tiene pocos, se dibuja lo que hay.
        s.totalExerciseDays == 1 -> ChartsContent.ONE_POINT
        else -> ChartsContent.CHART
    }

    fun body(s: ChartsUiState): ChartsContent = when {
        !s.bodyEverLoaded -> neverLoaded(s)
        s.bodyFields.isEmpty() -> ChartsContent.NO_BODY
        s.bodySeries.isEmpty() -> ChartsContent.EMPTY_PERIOD
        else -> ChartsContent.CHART
    }

    /**
     * Nunca bajado: carga mientras corre o antes del primer intento. Después, sin red → "Conectate una vez"; con red →
     * falla con Reintentar en la sección (no depende del banner, que se puede cerrar).
     */
    private fun neverLoaded(s: ChartsUiState): ChartsContent = when {
        s.isRefreshing || !s.refreshAttempted -> ChartsContent.LOADING
        s.isOffline -> ChartsContent.NEVER_LOADED
        else -> ChartsContent.LOAD_FAILED
    }
}
