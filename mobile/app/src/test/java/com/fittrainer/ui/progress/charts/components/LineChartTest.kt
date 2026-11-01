package com.fittrainer.ui.progress.charts.components

import com.fittrainer.data.progress.ChartPoint
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

/** El rango del eje Y ([yRange]): nunca de alto cero y nunca por debajo de 0. */
class LineChartTest {
    private fun points(vararg values: Double) = values.mapIndexed { i, v -> ChartPoint(LocalDate.of(2026, 10, 1 + i), v) }

    @Test fun unPuntoTieneMargenAlrededor() = assertEquals(72.0 to 88.0, yRange(points(80.0)))

    @Test fun unaSeriePlanaUsaElMismoMargenQueUnPunto() = assertEquals(72.0 to 88.0, yRange(points(80.0, 80.0, 80.0)))

    /** Un valor chico plano: el margen mínimo es 1, así el rango no queda de 0,2 de alto. */
    @Test fun unaSeriePlanaChicaUsaElMargenMinimo() = assertEquals(1.0 to 3.0, yRange(points(2.0, 2.0)))

    @Test fun conVariosValoresElMargenEsEl15PorCientoDelRecorrido() = assertEquals(75.0 to 115.0, yRange(points(80.0, 95.0, 110.0)))

    /** Con el mínimo cerca de 0, el margen de abajo no lleva el eje a negativo. */
    @Test fun elMinimoCercaDeCeroNoBajaDeCero() = assertEquals(0.0 to 12.0, yRange(points(0.5, 10.0)))

    @Test fun sinPuntosDevuelveUnRangoValido() = assertEquals(0.0 to 1.0, yRange(emptyList()))
}
