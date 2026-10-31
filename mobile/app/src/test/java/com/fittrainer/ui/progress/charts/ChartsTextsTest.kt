package com.fittrainer.ui.progress.charts

import com.fittrainer.data.progress.BodyField
import com.fittrainer.data.progress.ChartMetric
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
        assertEquals("24 oct", ChartsTexts.formatShortDate(LocalDate.of(2026, 10, 24)))
        assertEquals("3 ene", ChartsTexts.formatShortDate(LocalDate.of(2026, 1, 3)))
        assertEquals("desde 20 ago", ChartsTexts.formatSince(LocalDate.of(2026, 8, 20)))
    }
}
