package com.fittrainer.ui.progress.charts.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fittrainer.data.progress.ChartPoint
import com.fittrainer.ui.progress.charts.ChartsTexts
import com.fittrainer.ui.theme.FtColors
import com.patrykandpatrick.vico.compose.cartesian.CartesianChartHost
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberAxisGuidelineComponent
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberAxisLabelComponent
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberAxisLineComponent
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberAxisTickComponent
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberBottom
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberStart
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberLine
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberLineCartesianLayer
import com.patrykandpatrick.vico.compose.cartesian.rememberCartesianChart
import com.patrykandpatrick.vico.compose.cartesian.rememberVicoScrollState
import com.patrykandpatrick.vico.compose.cartesian.rememberVicoZoomState
import com.patrykandpatrick.vico.compose.common.component.rememberShapeComponent
import com.patrykandpatrick.vico.compose.common.fill
import com.patrykandpatrick.vico.core.cartesian.Zoom
import com.patrykandpatrick.vico.core.cartesian.axis.HorizontalAxis
import com.patrykandpatrick.vico.core.cartesian.axis.VerticalAxis
import com.patrykandpatrick.vico.core.cartesian.data.CartesianChartModelProducer
import com.patrykandpatrick.vico.core.cartesian.data.CartesianLayerRangeProvider
import com.patrykandpatrick.vico.core.cartesian.data.CartesianValueFormatter
import com.patrykandpatrick.vico.core.cartesian.data.lineSeries
import com.patrykandpatrick.vico.core.cartesian.layer.LineCartesianLayer
import com.patrykandpatrick.vico.core.common.shape.CorneredShape
import java.time.LocalDate
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.floor

/** Gráfico de línea (un punto por día en Cargas, por medición en Medidas). Único archivo que usa Vico. El récord (si está en la serie) va en ámbar. */
@Composable
fun LineChart(
    points: List<ChartPoint>,
    highlight: LocalDate?,
    lineColor: Color,
    modifier: Modifier = Modifier,
) {
    val producer = remember { CartesianChartModelProducer() }
    LaunchedEffect(points, highlight) {
        if (points.isEmpty()) return@LaunchedEffect
        val record = points.firstOrNull { it.date == highlight }
        producer.runTransaction {
            lineSeries {
                series(x = points.map { xUnits(it.x) }, y = points.map { it.value })
                if (record != null) series(x = listOf(xUnits(record.x)), y = listOf(record.value))
            }
        }
    }
    val (minY, maxY) = remember(points) { yRange(points) }
    val dot = CorneredShape.Pill
    val mainLine = LineCartesianLayer.rememberLine(
        fill = LineCartesianLayer.LineFill.single(fill(lineColor)),
        pointProvider = LineCartesianLayer.PointProvider.single(
            LineCartesianLayer.Point(rememberShapeComponent(fill(lineColor), dot), 8f),
        ),
    )
    // Ruling: sin 🏆 dentro del gráfico; el punto del récord queda dorado y el emoji va en la tarjeta "Récord 🏆".
    val recordLine = LineCartesianLayer.rememberLine(
        fill = LineCartesianLayer.LineFill.single(fill(Color.Transparent)),
        pointProvider = LineCartesianLayer.PointProvider.single(
            LineCartesianLayer.Point(rememberShapeComponent(fill(FtColors.Amber), dot), 14f),
        ),
    )
    val dateFormatter = CartesianValueFormatter { _, value, _ ->
        ChartsTexts.formatShortDate(LocalDate.ofEpochDay(floor(value / UNITS_PER_DAY).toLong()))
    }
    val valueFormatter = CartesianValueFormatter { _, value, _ -> ChartsTexts.formatNumber(value) }
    // Ejes legibles sobre el fondo oscuro: etiquetas en gris secundario; línea, marcas y guías en el borde del tema.
    val label = rememberAxisLabelComponent(color = FtColors.TextSecondary)
    val axisLine = rememberAxisLineComponent(fill = fill(FtColors.Border))
    val tick = rememberAxisTickComponent(fill = fill(FtColors.Border))
    val guideline = rememberAxisGuidelineComponent(fill = fill(FtColors.Border))
    CartesianChartHost(
        chart = rememberCartesianChart(
            rememberLineCartesianLayer(
                LineCartesianLayer.LineProvider.series(mainLine, recordLine),
                // El eje Y sigue a los datos (no arranca en 0): si no, la curva queda plana arriba de todo.
                rangeProvider = remember(minY, maxY) { CartesianLayerRangeProvider.fixed(minY = minY, maxY = maxY) },
            ),
            startAxis = VerticalAxis.rememberStart(
                line = axisLine, label = label, valueFormatter = valueFormatter, tick = tick, guideline = guideline,
            ),
            bottomAxis = HorizontalAxis.rememberBottom(
                line = axisLine,
                label = label,
                valueFormatter = dateFormatter,
                tick = tick,
                guideline = guideline,
                itemPlacer = remember { DayAxisItemPlacer() },
            ),
        ),
        modelProducer = producer,
        modifier = modifier.fillMaxWidth().height(220.dp),
        // Todo el período entra en el ancho: sin scroll ni zoom (si no, con "Todo" el récord queda fuera de pantalla).
        scrollState = rememberVicoScrollState(scrollEnabled = false),
        zoomState = rememberVicoZoomState(zoomEnabled = false, initialZoom = Zoom.Content),
    )
}

/** Rango Y con un margen alrededor de los datos. Una serie plana (o un punto) usa un margen mínimo: nunca rango cero. */
internal fun yRange(points: List<ChartPoint>): Pair<Double, Double> {
    if (points.isEmpty()) return 0.0 to 1.0
    val min = points.minOf { it.value }
    val max = points.maxOf { it.value }
    val pad = if (max > min) (max - min) * 0.15 else maxOf(abs(max) * 0.1, 1.0)
    return floor(min - pad).coerceAtLeast(0.0) to ceil(max + pad)
}
