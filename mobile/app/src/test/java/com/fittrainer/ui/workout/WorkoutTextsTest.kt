package com.fittrainer.ui.workout

import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.WorkoutSummary
import com.fittrainer.testing.fakes.workout.T0
import com.fittrainer.testing.fakes.workout.doneSet
import com.fittrainer.testing.fakes.workout.exercise
import com.fittrainer.testing.fakes.workout.workout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WorkoutTextsTest {

    @Test fun `reloj y cronometro`() {
        assertEquals("1:30", formatClock(90_000))
        assertEquals("0:05", formatClock(4_001))
        assertEquals("22:14", formatElapsed(T0, T0.plusSeconds(22 * 60 + 14)))
        assertEquals("1:02:03", formatElapsed(T0, T0.plusSeconds(3_723)))
    }

    @Test fun `numeros de peso con coma y tabs hechas`() {
        assertEquals("65", kgNumber(65.0))
        assertEquals("62,5", kgNumber(62.5))
        assertEquals("65·10", setTabLabel(doneSet(0, 1, kg = 65.0, reps = 10)))
        assertEquals("70kg × 8 reps", loadLine(Load(70.0, 8)))
    }

    @Test fun `chip de sugerido segun lo que trae la rutina`() {
        assertEquals("SUGERIDO · 70KG × 8", suggestedChip(exercise(0, suggestedKg = 70.0, reps = 8)))
        assertEquals("SUGERIDO · 8 REPS", suggestedChip(exercise(0, suggestedKg = null, reps = 8)))
        assertNull(suggestedChip(exercise(0, suggestedKg = null, reps = null)))
    }

    @Test fun `el CTA cambia en la ultima serie y al corregir`() {
        val first = WorkoutUiState(workout = workout())
        assertEquals(CTA_REST, ctaLabel(first))
        val last = workout(sets = listOf(doneSet(0, 1), doneSet(0, 2), doneSet(1, 1)), cursor = Cursor(1, 2))
        assertEquals(CTA_FINISH, ctaLabel(WorkoutUiState(workout = last)))
        assertEquals(CTA_CORRECT, ctaLabel(WorkoutUiState(workout = last, editingSet = 1)))
    }

    @Test fun `mensajes de cierre`() {
        assertEquals("Te falta 1 serie, ¿terminar igual?", missingSetsMessage(1))
        assertEquals("Te faltan 6 series, ¿terminar igual?", missingSetsMessage(6))
        assertEquals("Llevás 12 de 20 series", setsProgressText(12, 20))
        assertEquals("Llevás 1 de 1 serie", setsProgressText(1, 1))
        assertEquals("Sesión terminada · 18 series · 52 min", summaryText(WorkoutSummary(18, 52, "w-1")))
        assertEquals("EJERCICIO 2 / 2", exerciseCounter(workout(cursor = Cursor(1, 1))))
    }
}
