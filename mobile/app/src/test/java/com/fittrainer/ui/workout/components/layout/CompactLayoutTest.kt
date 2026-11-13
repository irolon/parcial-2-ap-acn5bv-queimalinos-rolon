package com.fittrainer.ui.workout.components.layout

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CompactLayoutTest {

    @Test fun `la parte de abajo ocupa lo que sobra del alto visible`() {
        assertEquals(400, fillMinHeight(viewport = 1000, top = 552, gap = 48))
        assertEquals(0, fillMinHeight(viewport = 600, top = 552, gap = 48)) // justo
        assertEquals(0, fillMinHeight(viewport = 500, top = 552, gap = 48)) // no entra: nunca negativo
    }

    @Test fun `con scroll la parte de abajo crece hasta que entren el boton y las acciones`() {
        assertEquals(400, fillHeight(available = 400, cta = 150, bottom = 100, gap = 48)) // sobra: el alto visible
        assertEquals(298, fillHeight(available = 100, cta = 150, bottom = 100, gap = 48)) // no entra: crece y se baja
        assertEquals(298, fillHeight(available = 0, cta = 150, bottom = 100, gap = 48))
    }

    @Test fun `compacto por debajo de 720 dp de alto`() {
        assertTrue(isCompactHeight(600)) // S10 con zoom grande
        assertTrue(isCompactHeight(719))
        assertFalse(isCompactHeight(720))
        assertFalse(isCompactHeight(800))
    }
}
