package com.fittrainer.ui.components.exercise

import org.junit.Assert.assertEquals
import org.junit.Test

class ExerciseTextsTest {

    @Test fun `musculos traducidos y desconocido tal cual`() {
        assertEquals("Pecho", muscleLabel("chest"))
        assertEquals("Cuerpo completo", muscleLabel("full_body"))
        assertEquals("pantorrilla", muscleLabel("pantorrilla"))
        assertEquals("", muscleLabel(null))
    }

    @Test fun `kilos sin decimales de mas`() {
        assertEquals("40 kg", formatKg(40.0))
        assertEquals("2,5 kg", formatKg(2.5))
    }

    @Test fun `orden de los grupos igual al del backend`() {
        assertEquals(
            listOf("chest", "back", "shoulders", "legs", "glutes", "biceps", "triceps", "core", "calves", "full_body", "cardio"),
            MUSCLE_ORDER,
        )
    }
}
