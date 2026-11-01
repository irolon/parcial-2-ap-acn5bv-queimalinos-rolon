package com.fittrainer.ui.students.metrics

import com.fittrainer.data.students.metrics.StudentMetric
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

class MetricsTextsTest {

    private fun metric(weight: Double? = 80.5, bmi: Double? = 24.1, fat: Double? = 18.0, height: Double? = null, waist: Double? = null) =
        StudentMetric("m", Instant.EPOCH, weight, height, fat, waist, null, null, bmi, "trainer")

    @Test fun `linea principal con coma y solo lo que hay`() {
        assertEquals("80,5 kg · IMC 24,1 · 18 %", metricLine(metric()))
        assertEquals("80,5 kg", metricLine(metric(bmi = null, fat = null)))
        assertEquals("Altura 178 cm", metricLine(metric(weight = null, bmi = null, fat = null, height = 178.0)))
    }

    @Test fun `circunferencias y quien la cargo`() {
        assertEquals("Cintura 82", circumferencesLine(metric(waist = 82.0)))
        assertEquals("", circumferencesLine(metric()))
        assertEquals("por vos", recordedByLabel("trainer"))
        assertEquals("por el alumno", recordedByLabel("student"))
    }
}
