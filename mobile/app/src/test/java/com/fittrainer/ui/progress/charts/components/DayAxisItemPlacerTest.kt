package com.fittrainer.ui.progress.charts.components

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DayAxisItemPlacerTest {
    private val day = UNITS_PER_DAY.toDouble()

    @Test
    fun unSoloPuntoTieneUnaEtiquetaEnSuPosicion() {
        assertEquals(listOf(20_000.5 * day), dayLabelValues(20_000.5 * day, 20_000.5 * day))
    }

    @Test
    fun todosEnElMismoDiaUsanUnaEtiquetaAlCentro() {
        assertEquals(listOf(20_000.5 * day), dayLabelValues(20_000.25 * day, 20_000.75 * day))
    }

    @Test
    fun unoODosDiasUsanUnaEtiquetaAlCentro() {
        assertEquals(listOf(20_000.5 * day), dayLabelValues(20_000 * day, 20_001 * day))
        assertEquals(listOf(20_001 * day), dayLabelValues(20_000 * day, 20_002 * day))
    }

    @Test
    fun lasEtiquetasSonDiasEnterosAlejadosDeLosBordes() {
        val min = 20_000.4 * day
        val max = 20_009.6 * day
        val v = dayLabelValues(min, max)
        val edge = (max - min) / 8
        assertTrue(v.isNotEmpty())
        assertTrue(v.all { it % day == 0.0 && it >= min + edge && it <= max - edge })
    }

    @Test
    fun rangoLargoDaDeTresACuatroEtiquetas() {
        val v = dayLabelValues(20_000 * day, 20_090 * day)
        assertTrue(v.size in 3..4)
        assertTrue(v.all { it % day == 0.0 && it > 20_000 * day && it < 20_090 * day })
    }
}
