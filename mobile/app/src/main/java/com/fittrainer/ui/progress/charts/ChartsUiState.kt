package com.fittrainer.ui.progress.charts

import com.fittrainer.data.db.progress.TrainedExercise
import com.fittrainer.data.progress.BodyField
import com.fittrainer.data.progress.ChartMetric
import com.fittrainer.data.progress.ChartPoint
import com.fittrainer.data.progress.ChartRange
import com.fittrainer.data.progress.DEFAULT_RANGE
import com.fittrainer.data.progress.Record

enum class ChartsView { LOADS, BODY }

/** Estado de Progreso → Gráficos (tarjeta 13). Las series ya vienen filtradas por el período. */
data class ChartsUiState(
    val view: ChartsView = ChartsView.LOADS,
    /** Room ya emitió la lista de ejercicios entrenados (antes de eso no se sabe si está vacía). */
    val exercisesLoaded: Boolean = false,
    val exercises: List<TrainedExercise> = emptyList(),
    val selectedExerciseId: String? = null,
    val metrics: List<ChartMetric> = emptyList(),
    val metric: ChartMetric? = null,
    val range: ChartRange = DEFAULT_RANGE,
    val exerciseSeries: List<ChartPoint> = emptyList(),
    /** Días entrenados del ejercicio en todo el historial (puntos guardados, de cualquier métrica), sin filtrar. */
    val totalExerciseDays: Int = 0,
    val record: Record? = null,
    val exerciseDelta: Double? = null,
    /** Ya se bajó alguna vez el ejercicio elegido (hay meta en Room). */
    val exerciseEverLoaded: Boolean = false,
    val bodyFields: List<BodyField> = emptyList(),
    val bodyField: BodyField? = null,
    val bodySeries: List<ChartPoint> = emptyList(),
    val bodyLast: ChartPoint? = null,
    val bodyDelta: Double? = null,
    val bodyEverLoaded: Boolean = false,
    val isOffline: Boolean = false,
    val isRefreshing: Boolean = false,
    val refreshFailed: Boolean = false,
    /** Ya terminó al menos un refresco de lo que se ve (ejercicio elegido o medidas), con o sin éxito. */
    val refreshAttempted: Boolean = false,
)
