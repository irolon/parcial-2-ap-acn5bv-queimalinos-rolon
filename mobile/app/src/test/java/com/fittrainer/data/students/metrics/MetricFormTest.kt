package com.fittrainer.data.students.metrics

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MetricFormTest {

    private val today = LocalDate.of(2026, 11, 1)
    private val now = "2026-11-01T10:15:00-03:00"

    @Test fun `coma decimal, vacio y basura`() {
        assertEquals(80.5, parseNumber("80,5")!!, 0.0)
        assertEquals(80.5, parseNumber(" 80.5 ")!!, 0.0)
        assertNull(parseNumber("  "))
        assertTrue(parseNumber("abc")!!.isNaN())
    }

    @Test fun `todo vacio es error general`() {
        assertEquals(setOf<MetricField?>(null), MetricForm(date = today).errors(today).keys)
    }

    @Test fun `fuera de rango marca el campo`() {
        val errors = MetricForm(weight = "-1", bodyFat = "101", waist = "8x", date = today).errors(today)
        assertEquals(setOf<MetricField?>(MetricField.WEIGHT, MetricField.BODY_FAT, MetricField.WAIST), errors.keys)
        assertTrue(MetricForm(bodyFat = "100", date = today).errors(today).isEmpty())
    }

    @Test fun `fecha futura es error`() {
        assertTrue(MetricField.DATE in MetricForm(weight = "80", date = today.plusDays(1)).errors(today))
    }

    @Test fun `hoy va con la hora real y opcionales vacios en null`() {
        val r = MetricForm(weight = "80,5", waist = "82", date = today).toRequest("id-1", today, now)
        assertEquals("id-1", r.id)
        assertEquals(now, r.recordedAt)
        assertEquals(80.5, r.weightKg!!, 0.0)
        assertEquals(82.0, r.waistCm!!, 0.0)
        assertNull(r.heightCm)
        assertNull(r.bodyFatPct)
    }

    @Test fun `un dia anterior va al mediodia argentino de ese dia, no a medianoche UTC`() {
        val r = MetricForm(weight = "80", date = LocalDate.of(2026, 10, 28)).toRequest("id-1", today, now)
        assertEquals("2026-10-28T12:00:00-03:00", r.recordedAt)
    }
}
