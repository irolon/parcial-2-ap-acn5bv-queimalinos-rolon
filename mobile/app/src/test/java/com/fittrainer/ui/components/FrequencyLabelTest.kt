package com.fittrainer.ui.components

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class FrequencyLabelTest {

    @Test fun `opciones del selector de 1 a 7 con singular y Sin definir`() {
        assertEquals(listOf("1", "2", "3", "4", "5", "6", "7"), FREQUENCY_OPTIONS)
        assertEquals("1 día / semana", frequencyOptionLabel("1"))
        assertEquals("4 días / semana", frequencyOptionLabel("4"))
        assertEquals("Sin definir", frequencyOptionLabel(null))
        assertEquals("Sin definir", frequencyOptionLabel("9"))
    }

    @Test fun `linea de la ficha como la web`() {
        assertEquals("4 días/semana", frequencyLine(4))
        assertEquals("1 día/semana", frequencyLine(1))
        assertNull(frequencyLine(null))
        assertNull(frequencyLine(0))
    }
}
