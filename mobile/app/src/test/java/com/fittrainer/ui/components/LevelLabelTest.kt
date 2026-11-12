package com.fittrainer.ui.components

import org.junit.Test
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull

class LevelLabelTest {
    @Test fun `etiqueta de nivel`() {
        assertEquals("Principiante", levelLabel("beginner"))
        assertEquals("Intermedio", levelLabel("intermediate"))
        assertEquals("Avanzado", levelLabel("advanced"))
        assertNull(levelLabel(null))
        assertEquals("x", levelLabel("x"))
    }

    @Test fun `etiqueta de nivel para selectores`() {
        assertEquals("Sin definir", levelOptionLabel(null))
        assertEquals("Avanzado", levelOptionLabel("advanced"))
    }
}
