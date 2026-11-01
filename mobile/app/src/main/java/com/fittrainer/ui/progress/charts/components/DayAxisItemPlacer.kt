package com.fittrainer.ui.progress.charts.components

import com.patrykandpatrick.vico.core.cartesian.CartesianDrawingContext
import com.patrykandpatrick.vico.core.cartesian.CartesianMeasuringContext
import com.patrykandpatrick.vico.core.cartesian.axis.HorizontalAxis
import com.patrykandpatrick.vico.core.cartesian.layer.CartesianLayerDimensions
import kotlin.math.ceil
import kotlin.math.floor

internal const val UNITS_PER_DAY = 86_400_000L

/** El eje X trabaja en milisegundos (enteros) para que el paso interno de Vico sea exacto. */
internal fun xUnits(x: Double): Long = Math.round(x * UNITS_PER_DAY)

/**
 * Posiciones de las etiquetas del eje X: días enteros del interior del rango (a más de 1/8 del ancho de cada borde, para
 * que Vico no las recorte con "…"), cada k días para tener unas 4. Sin ningún día así (un punto, el mismo día, 1-2 días)
 * devuelve una sola etiqueta en el centro.
 */
internal fun dayLabelValues(minX: Double, maxX: Double, target: Int = 4): List<Double> {
    val edge = (maxX - minX) / 8
    val first = ceil((minX + edge) / UNITS_PER_DAY).toLong()
    val last = floor((maxX - edge) / UNITS_PER_DAY).toLong()
    if (last < first) return listOf((minX + maxX) / 2)
    val every = ceil((last - first + 1) / target.toDouble()).toLong().coerceAtLeast(1L)
    return generateSequence(first) { it + every }.takeWhile { it <= last }.map { (it * UNITS_PER_DAY).toDouble() }.toList()
}

/** Etiquetas y guías solo en días enteros del interior del rango. */
internal class DayAxisItemPlacer(
    private val base: HorizontalAxis.ItemPlacer = HorizontalAxis.ItemPlacer.aligned(),
) : HorizontalAxis.ItemPlacer by base {
    override fun getLabelValues(
        context: CartesianDrawingContext,
        visibleXRange: ClosedFloatingPointRange<Double>,
        fullXRange: ClosedFloatingPointRange<Double>,
        maxLabelWidth: Float,
    ): List<Double> = dayLabelValues(fullXRange.start, fullXRange.endInclusive).filter { it in visibleXRange }

    override fun getWidthMeasurementLabelValues(
        context: CartesianMeasuringContext,
        layerDimensions: CartesianLayerDimensions,
        fullXRange: ClosedFloatingPointRange<Double>,
    ): List<Double> = dayLabelValues(fullXRange.start, fullXRange.endInclusive)

    override fun getLineValues(
        context: CartesianDrawingContext,
        visibleXRange: ClosedFloatingPointRange<Double>,
        fullXRange: ClosedFloatingPointRange<Double>,
        maxLabelWidth: Float,
    ): List<Double> = getLabelValues(context, visibleXRange, fullXRange, maxLabelWidth)
}
