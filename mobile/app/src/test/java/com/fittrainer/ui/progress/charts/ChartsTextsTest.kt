package com.fittrainer.ui.progress.charts

import com.fittrainer.data.progress.BodyField
import com.fittrainer.data.progress.ChartMetric
import com.fittrainer.data.progress.ChartPoint
import com.fittrainer.data.progress.ChartRange
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ChartsTextsTest {
    @Test fun formatKg_usesCommaAndDropsIntegerDecimals() {
        assertEquals("112,5 kg", ChartsTexts.formatKg(112.5))
        assertEquals("80 kg", ChartsTexts.formatKg(80.0))
    }

    @Test fun formatDelta_signsAndUnit() {
        assertEquals("+17,5 kg", ChartsTexts.formatDelta(17.5, "kg"))
        assertEquals("−2,3 kg", ChartsTexts.formatDelta(-2.3, "kg"))
        assertEquals("0 kg", ChartsTexts.formatDelta(0.0, "kg"))
        assertEquals("+4 reps", ChartsTexts.formatDelta(4.0, "reps"))
        assertEquals("+1,2", ChartsTexts.formatDelta(1.2, ""))
    }

    /** Verde solo si el texto muestra una suba: +0,04 se ve "0 kg" y no va en verde. */
    @Test fun isRise_usesTheRoundedValue() {
        assertFalse(ChartsTexts.isRise(0.04))
        assertFalse(ChartsTexts.isRise(0.0))
        assertFalse(ChartsTexts.isRise(-2.0))
        assertTrue(ChartsTexts.isRise(0.05))
        assertTrue(ChartsTexts.isRise(17.5))
    }

    @Test fun labels() {
        assertEquals("1RM est.", ChartsTexts.metricLabel(ChartMetric.E1RM))
        assertEquals("Kg máx", ChartsTexts.metricLabel(ChartMetric.MAX_KG))
        assertEquals("Reps totales", ChartsTexts.metricLabel(ChartMetric.REPS))
        assertEquals(listOf("1M", "3M", "6M", "Todo"), ChartRange.entries.map(ChartsTexts::rangeLabel))
        assertEquals(
            listOf("Peso", "% grasa", "Cadera", "Pecho", "IMC"),
            BodyField.entries.map(ChartsTexts::fieldLabel),
        )
        assertEquals(listOf("kg", "%", "cm", "cm", ""), BodyField.entries.map(ChartsTexts::fieldUnit))
    }

    @Test fun formatShortDate() {
        val today = LocalDate.of(2026, 11, 1)
        assertEquals("24 oct", ChartsTexts.formatShortDate(LocalDate.of(2026, 10, 24), today))
        assertEquals("3 ene", ChartsTexts.formatShortDate(LocalDate.of(2026, 1, 3), today))
        assertEquals("desde 20 ago", ChartsTexts.formatSince(LocalDate.of(2026, 8, 20), today))
    }

    /** Con "Todo" y más de un año de historia, el eje y el récord no pueden quedar ambiguos. */
    @Test fun formatShortDate_addsTheYearWhenItIsNotTheCurrentOne() {
        val today = LocalDate.of(2026, 1, 5)
        assertEquals("12 mar 2025", ChartsTexts.formatShortDate(LocalDate.of(2025, 3, 12), today))
        assertEquals("31 dic 2025", ChartsTexts.formatShortDate(LocalDate.of(2025, 12, 31), today))
        assertEquals("2 ene", ChartsTexts.formatShortDate(LocalDate.of(2026, 1, 2), today))
        assertEquals("desde 1 jul 2024", ChartsTexts.formatSince(LocalDate.of(2024, 7, 1), today))
    }

    @Test fun chartDescription_saysWhatPeriodAndFromWhereToWhere() {
        val points = listOf(
            ChartPoint(LocalDate.of(2026, 8, 1), 80.0),
            ChartPoint(LocalDate.of(2026, 9, 1), 87.5),
            ChartPoint(LocalDate.of(2026, 10, 1), 95.0),
        )
        assertEquals(
            "1RM est. de Press de banca en 3 meses: de 80 kg a 95 kg",
            ChartsTexts.chartDescription("1RM est. de Press de banca", ChartRange.M3, points, "kg"),
        )
        assertEquals("IMC en todo el historial: de 80 a 95", ChartsTexts.chartDescription("IMC", ChartRange.ALL, points, ""))
        assertEquals("Peso en el último mes: 80 kg", ChartsTexts.chartDescription("Peso", ChartRange.M1, points.take(1), "kg"))
        assertEquals(
            "Reps totales de Dominadas en 6 meses: sin datos",
            ChartsTexts.chartDescription("Reps totales de Dominadas", ChartRange.M6, emptyList(), "reps"),
        )
    }
}
