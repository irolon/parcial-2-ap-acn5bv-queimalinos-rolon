package com.fittrainer.ui.today

import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.ui.components.exercise.ExerciseDetail
import org.junit.Assert.assertEquals
import org.junit.Test

class TodayDetailTest {

    @Test fun `el detalle de Hoy lleva la prescripcion y no descripcion`() {
        val exercise = RoutineExercise(
            "re-1", "ex-1", "Press", "chest", "Barra", "https://v", 4, 8, 90, 40.0, "3-1-1", "Codos cerrados",
        )
        assertEquals(
            ExerciseDetail(
                name = "Press", muscleGroup = "chest", equipment = "Barra", videoUrl = "https://v",
                sets = 4, reps = 8, suggestedKg = 40.0, tempo = "3-1-1", restSeconds = 90, notes = "Codos cerrados",
            ),
            exercise.toDetail(),
        )
    }
}
