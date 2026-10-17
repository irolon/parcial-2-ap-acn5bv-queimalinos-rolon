package com.fittrainer.ui.today

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class RoutineTextsTest {

    private fun exercise(sets: Int? = 4, reps: Int? = 8, rest: Int? = 90, muscle: String? = "chest") =
        RoutineExercise("re", "ex", "Press", muscle, null, null, sets, reps, rest, null, null, null)

    @Test fun `fecha del encabezado en mayusculas y sin locale`() {
        assertEquals("SÁBADO · 17 OCT", headerDate(LocalDate.of(2026, 10, 17)))
        assertEquals("MIÉRCOLES · 2 DIC", headerDate(LocalDate.of(2026, 12, 2)))
    }

    @Test fun `iniciales de la semana`() {
        assertEquals("LMXJVSD", DayOfWeek.values().joinToString("") { dayInitial(it) })
    }

    @Test fun `musculos traducidos y desconocido tal cual`() {
        assertEquals("Pecho", muscleLabel("chest"))
        assertEquals("Cuerpo completo", muscleLabel("full_body"))
        assertEquals("pantorrilla", muscleLabel("pantorrilla"))
        assertEquals("", muscleLabel(null))
    }

    @Test fun `series por reps y casos sin datos`() {
        assertEquals("4×8", setsReps(exercise()))
        assertEquals("3 series", setsReps(exercise(sets = 3, reps = null)))
        assertEquals("1 serie", setsReps(exercise(sets = 1, reps = null)))
        assertEquals("12 reps", setsReps(exercise(sets = null, reps = 12)))
        assertEquals("", setsReps(exercise(sets = null, reps = null)))
    }

    // Review Focus 3: sin "null" ni separadores colgando.
    @Test fun `subtitulo del ejercicio con datos faltantes`() {
        assertEquals("4×8 · Pecho", exerciseSubtitle(exercise()))
        assertEquals("Pecho", exerciseSubtitle(exercise(sets = null, reps = null)))
        assertEquals("4×8", exerciseSubtitle(exercise(muscle = null)))
        assertEquals("", exerciseSubtitle(exercise(sets = null, reps = null, muscle = null)))
    }

    @Test fun `series totales cuentan los nulos como cero`() {
        assertEquals(7, totalSets(listOf(exercise(sets = 4), exercise(sets = 3), exercise(sets = null))))
    }

    @Test fun `minutos estimados redondeados a 5`() {
        // 3 ejercicios × 4 series × (45 + 90) s = 1620 s = 27 min → 25
        assertEquals(25, estimatedMinutes(List(3) { exercise(sets = 4, rest = 90) }))
        // 4 × (45 + 60 por defecto) = 420 s = 7 min → 5
        assertEquals(5, estimatedMinutes(listOf(exercise(sets = 4, rest = null))))
        assertEquals(0, estimatedMinutes(emptyList()))
    }

    // Review Focus 1: una rutina corta no dice "~0 MIN".
    @Test fun `rutina muy corta estima al menos 5 minutos`() {
        assertEquals(5, estimatedMinutes(listOf(exercise(sets = null, rest = 30))))
    }

    @Test fun `resumen de la tarjeta con plurales`() {
        val routine = Routine("r", "Push", null, emptySet(), Instant.EPOCH, listOf(exercise(sets = 1, rest = 60)))
        assertEquals("1 EJERCICIO · ~5 MIN · 1 SERIE", heroSummary(routine))
        val two = routine.copy(exercises = List(2) { exercise(sets = 4, rest = 90) })
        assertEquals("2 EJERCICIOS · ~20 MIN · 8 SERIES", heroSummary(two))
    }

    // Review Focus 2: sin próximo día, sin "null".
    @Test fun `mensaje de descanso con y sin proximo dia`() {
        assertEquals("Hoy descansás. Tu próximo entreno es el jueves.", restMessage(DayOfWeek.THURSDAY))
        assertEquals("Hoy descansás.", restMessage(null))
    }

    @Test fun `kilos sin decimales de mas`() {
        assertEquals("40 kg", formatKg(40.0))
        assertEquals("2,5 kg", formatKg(2.5))
    }
}
