package com.fittrainer.ui.routines.detail

import com.fittrainer.data.routine.RoutineExercise
import org.junit.Assert.assertEquals
import org.junit.Test

class DetailTextsTest {

    private fun exercise(sets: Int? = 4, reps: Int? = 10, kg: Double? = 60.0, rest: Int? = 90, muscle: String? = "chest") =
        RoutineExercise("re-1", "ex-1", "Press", muscle, null, null, sets, reps, rest, kg, null, null)

    @Test fun `subtitulo completo y sin separadores colgando`() {
        assertEquals("4×10 · 60 kg · 90 s · Pecho", detailSubtitle(exercise()))
        assertEquals("4 series · Pecho", detailSubtitle(exercise(reps = null, kg = null, rest = null)))
        assertEquals("", detailSubtitle(exercise(sets = null, reps = null, kg = null, rest = null, muscle = null)))
    }
}
