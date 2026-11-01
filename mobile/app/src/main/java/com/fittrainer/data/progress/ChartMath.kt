package com.fittrainer.data.progress

import com.fittrainer.data.db.progress.ProgressBodyPointEntity
import com.fittrainer.data.db.progress.ProgressExerciseMetaEntity
import com.fittrainer.data.db.progress.ProgressExercisePointEntity
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

fun availableMetrics(points: List<ProgressExercisePointEntity>): List<ChartMetric> {
    val metrics = buildList {
        if (points.any { (it.e1rmKg ?: 0.0) > 0 }) add(ChartMetric.E1RM)
        if (points.any { (it.maxKg ?: 0.0) > 0 }) add(ChartMetric.MAX_KG)
    }
    return metrics.ifEmpty { listOf(ChartMetric.REPS) }
}

fun initialMetric(defaultMetric: String?, available: List<ChartMetric>): ChartMetric =
    available.firstOrNull { it.apiName == defaultMetric } ?: available.first()

fun series(points: List<ProgressExercisePointEntity>, metric: ChartMetric): List<ChartPoint> =
    points.mapNotNull { p ->
        val value = when (metric) {
            ChartMetric.E1RM -> p.e1rmKg?.takeIf { it > 0 }
            ChartMetric.MAX_KG -> p.maxKg?.takeIf { it > 0 }
            ChartMetric.REPS -> p.reps.toDouble()
        }
        value?.let { ChartPoint(LocalDate.parse(p.date), it) }
    }

fun inRange(series: List<ChartPoint>, range: ChartRange, today: LocalDate): List<ChartPoint> {
    val days = range.days ?: return series
    val from = today.minusDays(days.toLong())
    return series.filter { !it.date.isBefore(from) }
}

fun delta(series: List<ChartPoint>): Double? =
    if (series.size < 2) null else series.last().value - series.first().value

fun record(
    meta: ProgressExerciseMetaEntity?,
    points: List<ProgressExercisePointEntity>,
    metric: ChartMetric,
): Record? = when (metric) {
    ChartMetric.E1RM -> recordOf(meta?.prE1rmKg, meta?.prE1rmDate)
    ChartMetric.MAX_KG -> recordOf(meta?.prMaxKg, meta?.prMaxKgDate)
    ChartMetric.REPS -> points.maxByOrNull { it.reps }?.let { Record(it.reps.toDouble(), LocalDate.parse(it.date)) }
}

private fun recordOf(value: Double?, date: String?): Record? =
    if (value == null || date == null) null else Record(value, LocalDate.parse(date))

private fun valueOf(p: ProgressBodyPointEntity, field: BodyField): Double? = when (field) {
    BodyField.WEIGHT -> p.weightKg
    BodyField.BODY_FAT -> p.bodyFatPct
    BodyField.HIP -> p.hipCm
    BodyField.CHEST -> p.chestCm
    BodyField.BMI -> p.bmi
}

/**
 * Un punto por medición con valor, en orden (recordedAt, id). X = día local + hora del día, estrictamente creciente:
 * si una medición cae en el mismo instante que la anterior (o antes tras un empuje), su X se corre [X_STEP_DAYS] (1 s)
 * hacia adelante. El paso es de 1000 ms, que sobrevive al redondeo a milisegundos de xUnits. Solo se mueve X; la
 * fecha del punto es siempre la real (un empuje de segundos solo podría cruzar medianoche con mediciones a segundos de ella).
 */
fun bodySeries(points: List<ProgressBodyPointEntity>, field: BodyField, zone: ZoneId): List<ChartPoint> {
    var previousX = Double.NEGATIVE_INFINITY
    return points.sortedWith(compareBy({ it.recordedAt }, { it.id })).mapNotNull { p ->
        valueOf(p, field)?.let {
            val local = Instant.ofEpochMilli(p.recordedAt).atZone(zone)
            val real = local.toLocalDate().toEpochDay() + local.toLocalTime().toNanoOfDay() / NANOS_PER_DAY
            val x = if (real <= previousX) previousX + X_STEP_DAYS else real
            previousX = x
            ChartPoint(local.toLocalDate(), it, x)
        }
    }
}

private const val NANOS_PER_DAY = 86_400_000_000_000.0
private const val X_STEP_DAYS = 1_000.0 / 86_400_000.0

fun availableFields(points: List<ProgressBodyPointEntity>): List<BodyField> =
    BodyField.entries.filter { f -> points.any { valueOf(it, f) != null } }
