package com.fittrainer.ui.progress.charts

import com.fittrainer.data.db.progress.TrainedExercise
import com.fittrainer.data.progress.BodyField
import com.fittrainer.data.progress.ChartPoint
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class ChartsEmptyStateTest {
    private val point = ChartPoint(LocalDate.of(2026, 10, 1), 80.0)
    private val loaded = ChartsUiState(
        exercisesLoaded = true,
        exercisesEverLoaded = true,
        exercises = listOf(TrainedExercise("e1", "Sentadilla", 5, "2026-10-01")),
        selectedExerciseId = "e1",
        exerciseEverLoaded = true,
        totalExerciseDays = 5,
        exerciseSeries = listOf(point, point),
    )
    private val bodyLoaded = ChartsUiState(
        bodyEverLoaded = true,
        bodyFields = listOf(BodyField.WEIGHT),
        bodyField = BodyField.WEIGHT,
        bodySeries = listOf(point),
    )

    /** Recién con la lista bajada (overview) y vacía se sabe que no entrenó nada. */
    @Test fun noExercises() = assertEquals(
        ChartsContent.NO_EXERCISES,
        ChartsEmptyState.exercises(ChartsUiState(exercisesLoaded = true, exercisesEverLoaded = true)),
    )

    /**
     * Caso B de la revisión: Room ya emitió (vacía) pero el overview nunca se bajó, aunque la alumna tenga sesiones en el
     * historial. No es "Terminá tu primera sesión": carga mientras corre, "Conectate una vez" sin red, falla con Reintentar.
     */
    @Test fun listaNuncaBajadaNoEsNoExercises() {
        val s = ChartsUiState(exercisesLoaded = true)
        assertEquals(ChartsContent.LOADING, ChartsEmptyState.exercises(s))
        assertEquals(ChartsContent.LOADING, ChartsEmptyState.exercises(s.copy(listRefreshing = true, listRefreshAttempted = true)))
        assertEquals(ChartsContent.NEVER_LOADED, ChartsEmptyState.exercises(s.copy(listRefreshAttempted = true, isOffline = true)))
        assertEquals(ChartsContent.LOAD_FAILED, ChartsEmptyState.exercises(s.copy(listRefreshAttempted = true)))
    }

    /** El estado de la lista no se mezcla con el del ejercicio: un ejercicio ya intentado no apura el veredicto de la lista. */
    @Test fun listaNuncaBajadaUsaSuPropioRefresco() {
        val s = ChartsUiState(exercisesLoaded = true, refreshAttempted = true, isOffline = true)
        assertEquals(ChartsContent.LOADING, ChartsEmptyState.exercises(s))
    }

    /** Hasta que Room emite la primera lista no se sabe si hay ejercicios: carga, no "Terminá tu primera sesión". */
    @Test fun exercisesNotLoadedYetIsLoading() = assertEquals(ChartsContent.LOADING, ChartsEmptyState.exercises(ChartsUiState()))

    @Test fun neverLoadedOfflineVsRefreshing() {
        val s = loaded.copy(exerciseEverLoaded = false, isOffline = true, refreshAttempted = true)
        assertEquals(ChartsContent.NEVER_LOADED, ChartsEmptyState.exercises(s))
        assertEquals(ChartsContent.LOADING, ChartsEmptyState.exercises(s.copy(isRefreshing = true)))
    }

    /** Online, nunca bajado y el pedido terminó sin datos: falla con Reintentar en la sección, aunque se cierre el banner. */
    @Test fun neverLoadedOnlineAfterAttemptIsLoadFailed() {
        val s = loaded.copy(exerciseEverLoaded = false, refreshAttempted = true, refreshFailed = true)
        assertEquals(ChartsContent.LOAD_FAILED, ChartsEmptyState.exercises(s))
        assertEquals(ChartsContent.LOAD_FAILED, ChartsEmptyState.exercises(s.copy(refreshFailed = false)))
        assertEquals(ChartsContent.NEVER_LOADED, ChartsEmptyState.exercises(s.copy(isOffline = true)))
    }

    /** Antes del primer intento (o mientras corre) es carga. */
    @Test fun neverLoadedBeforeFirstAttemptIsLoading() {
        val s = loaded.copy(exerciseEverLoaded = false)
        assertEquals(ChartsContent.LOADING, ChartsEmptyState.exercises(s))
        assertEquals(ChartsContent.LOADING, ChartsEmptyState.exercises(s.copy(refreshAttempted = true, isRefreshing = true)))
    }

    @Test fun loadedWithoutAnyPoint() =
        assertEquals(ChartsContent.NO_DATA, ChartsEmptyState.exercises(loaded.copy(totalExerciseDays = 0, exerciseSeries = emptyList())))

    @Test fun onePointInsidePeriod() =
        assertEquals(ChartsContent.ONE_POINT, ChartsEmptyState.exercises(loaded.copy(totalExerciseDays = 1, exerciseSeries = listOf(point))))

    /** Muchos días entrenados pero la métrica tiene un solo punto en el período: se dibuja lo que hay. */
    @Test fun manyDaysWithOneMetricPointIsChart() =
        assertEquals(ChartsContent.CHART, ChartsEmptyState.exercises(loaded.copy(totalExerciseDays = 4, exerciseSeries = listOf(point))))

    @Test fun onePointOutsidePeriodIsEmptyPeriod() =
        assertEquals(ChartsContent.EMPTY_PERIOD, ChartsEmptyState.exercises(loaded.copy(totalExerciseDays = 1, exerciseSeries = emptyList())))

    @Test fun emptyPeriodWithPointsElsewhere() =
        assertEquals(ChartsContent.EMPTY_PERIOD, ChartsEmptyState.exercises(loaded.copy(exerciseSeries = emptyList())))

    @Test fun chart() = assertEquals(ChartsContent.CHART, ChartsEmptyState.exercises(loaded))

    @Test fun bodyNeverLoaded() {
        assertEquals(ChartsContent.NEVER_LOADED, ChartsEmptyState.body(ChartsUiState(isOffline = true, refreshAttempted = true)))
        assertEquals(ChartsContent.LOADING, ChartsEmptyState.body(ChartsUiState(isOffline = true, refreshAttempted = true, isRefreshing = true)))
    }

    @Test fun bodyNeverLoadedOnlineAfterAttemptIsLoadFailed() {
        assertEquals(ChartsContent.LOAD_FAILED, ChartsEmptyState.body(ChartsUiState(refreshAttempted = true)))
        assertEquals(ChartsContent.LOADING, ChartsEmptyState.body(ChartsUiState()))
    }

    @Test fun bodyNoFields() =
        assertEquals(ChartsContent.NO_BODY, ChartsEmptyState.body(bodyLoaded.copy(bodyFields = emptyList(), bodySeries = emptyList())))

    @Test fun bodyEmptyPeriod() =
        assertEquals(ChartsContent.EMPTY_PERIOD, ChartsEmptyState.body(bodyLoaded.copy(bodySeries = emptyList())))

    @Test fun bodyChart() = assertEquals(ChartsContent.CHART, ChartsEmptyState.body(bodyLoaded))
}
