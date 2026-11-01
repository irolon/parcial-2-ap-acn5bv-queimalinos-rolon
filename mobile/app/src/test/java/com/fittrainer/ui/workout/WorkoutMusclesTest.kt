package com.fittrainer.ui.workout

import com.fittrainer.data.workout.WorkoutExercise
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WorkoutMusclesTest {
    private fun ex(group: String?, equipment: String?, sets: Int?) = WorkoutExercise(
        0, null, "e1", null, "Press", group, equipment, null, null, sets, 8, 90, 60.0,
    )

    @Test fun `la tarjeta solo se ofrece si el grupo pinta algo`() {
        assertTrue(showsMuscleCard("chest"))
        assertTrue(showsMuscleCard("full_body"))
        assertFalse(showsMuscleCard("cardio"))
        assertFalse(showsMuscleCard(null))
        assertFalse(showsMuscleCard("yoga"))
    }

    @Test fun `la tarjeta entra segun el alto medido`() {
        // 300 + 48 + 150 + 48 + 100 = 646
        assertTrue(cardFits(646, 300, 150, 100, 48)) // justo
        assertFalse(cardFits(645, 300, 150, 100, 48)) // un pixel corto
        assertTrue(cardFits(346, 0, 150, 100, 48)) // sin alto de tarjeta
    }

    @Test fun `las acciones van al fondo pero nunca encima del boton`() {
        assertEquals(300, bottomActionsY(height = 400, ctaBottom = 150, gap = 48, bottom = 100)) // sobra: al fondo
        assertEquals(198, bottomActionsY(height = 200, ctaBottom = 150, gap = 48, bottom = 100)) // no entra: debajo del botón
        assertEquals(104, bottomActionsY(height = 80, ctaBottom = 56, gap = 48, bottom = 48)) // escenario de Codex: sin solape
    }

    @Test fun `linea de equipo y series`() {
        assertEquals("Barra · 4 series", muscleCardLine(ex("chest", "barbell", 4)))
        assertEquals("4 series", muscleCardLine(ex("chest", null, 4)))
        assertEquals("Peso corporal · 1 serie", muscleCardLine(ex("core", "bodyweight", 1)))
        assertEquals("Mancuernas · 3 series", muscleCardLine(ex("chest", "dumbbell", null))) // DEFAULT_SETS
    }
}
