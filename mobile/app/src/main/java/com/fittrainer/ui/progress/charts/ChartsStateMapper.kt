package com.fittrainer.ui.progress.charts

import com.fittrainer.data.db.progress.TrainedExercise
import com.fittrainer.data.progress.BodyChart
import com.fittrainer.data.progress.BodyField
import com.fittrainer.data.progress.ChartMetric
import com.fittrainer.data.progress.ChartRange
import com.fittrainer.data.progress.ExerciseChart
import com.fittrainer.data.progress.availableFields
import com.fittrainer.data.progress.availableMetrics
import com.fittrainer.data.progress.bodySeries
import com.fittrainer.data.progress.delta
import com.fittrainer.data.progress.inRange
import com.fittrainer.data.progress.initialMetric
import com.fittrainer.data.progress.record
import com.fittrainer.data.progress.series
import java.time.LocalDate
import java.time.ZoneId

/** Lo que sale de Room para armar la pantalla. `exercises` es null hasta que Room emite la primera lista. */
internal data class ChartsData(
    val exercises: List<TrainedExercise>?,
    val selectedId: String?,
    val chart: ExerciseChart?,
    val body: BodyChart,
)

/** Lo que el alumno eligió (viene de SavedStateHandle); null = el valor por defecto. */
internal data class ChartsPrefs(
    val view: ChartsView,
    val metric: ChartMetric?,
    val range: ChartRange,
    val bodyField: BodyField?,
)

/** Estado del refresco de lo que se ve: corriendo, con error y si ya terminó alguno. */
internal data class RefreshFlags(val running: Boolean = false, val failed: Boolean = false, val attempted: Boolean = false)

internal fun buildChartsState(
    data: ChartsData,
    prefs: ChartsPrefs,
    isOffline: Boolean,
    refresh: RefreshFlags,
    today: LocalDate,
    zone: ZoneId,
): ChartsUiState {
    // Al cambiar de ejercicio, hasta que Room emite el nuevo, el gráfico anterior no se muestra con el nombre del nuevo.
    val chart = data.chart?.takeIf { it.exerciseId == data.selectedId }
    val points = chart?.points.orEmpty()
    val meta = chart?.meta
    val metrics = if (points.isEmpty()) emptyList() else availableMetrics(points)
    val metric = metrics.takeIf { it.isNotEmpty() }?.let { m -> prefs.metric?.takeIf { it in m } ?: initialMetric(meta?.defaultMetric, m) }
    val full = metric?.let { series(points, it) }.orEmpty()
    val shown = inRange(full, prefs.range, today)

    val bodyFields = availableFields(data.body.points)
    val bodyField = prefs.bodyField?.takeIf { it in bodyFields } ?: bodyFields.firstOrNull()
    val bodyFull = bodyField?.let { bodySeries(data.body.points, it, zone) }.orEmpty()
    val bodyShown = inRange(bodyFull, prefs.range, today)

    return ChartsUiState(
        view = prefs.view,
        exercisesLoaded = data.exercises != null,
        exercises = data.exercises.orEmpty(),
        selectedExerciseId = data.selectedId,
        metrics = metrics,
        metric = metric,
        range = prefs.range,
        exerciseSeries = shown,
        totalExerciseDays = points.size,
        record = metric?.let { record(meta, points, it) },
        exerciseDelta = delta(shown),
        exerciseEverLoaded = meta != null,
        bodyFields = bodyFields,
        bodyField = bodyField,
        bodySeries = bodyShown,
        bodyLast = bodyFull.lastOrNull(),
        bodyDelta = delta(bodyShown),
        bodyEverLoaded = data.body.fetchedAt != null,
        isOffline = isOffline,
        isRefreshing = refresh.running,
        refreshFailed = refresh.failed,
        refreshAttempted = refresh.attempted,
    )
}
