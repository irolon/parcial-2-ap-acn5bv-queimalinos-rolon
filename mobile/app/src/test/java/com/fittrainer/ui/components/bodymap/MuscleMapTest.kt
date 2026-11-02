package com.fittrainer.ui.components.bodymap

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MuscleMapTest {
    @Test fun `cada grupo pinta sus partes`() {
        assertEquals(setOf("chest"), partsFor("chest"))
        assertEquals(setOf("upper-back", "lower-back", "trapezius"), partsFor("back"))
        assertEquals(setOf("deltoids"), partsFor("shoulders"))
        assertEquals(setOf("quadriceps", "hamstring", "adductors"), partsFor("legs"))
        assertEquals(setOf("gluteal"), partsFor("glutes"))
        assertEquals(setOf("biceps"), partsFor("biceps"))
        assertEquals(setOf("triceps"), partsFor("triceps"))
        assertEquals(setOf("abs", "obliques"), partsFor("core"))
        assertEquals(setOf("calves"), partsFor("calves"))
        assertEquals(ALL_MUSCLE_PARTS, partsFor("full_body"))
    }

    @Test fun `cardio, nulo y desconocido no pintan`() {
        listOf("cardio", null, "yoga").forEach {
            assertTrue(partsFor(it).isEmpty())
            assertFalse(paints(it))
        }
    }
}
