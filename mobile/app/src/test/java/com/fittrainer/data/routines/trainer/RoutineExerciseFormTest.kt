package com.fittrainer.data.routines.trainer

import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RoutineExerciseFormTest {

    private val before = TrainerRoutineExercise(
        id = "re1", exerciseId = "e1", name = "Press de banca", muscleGroup = "chest", equipment = "barbell",
        sets = 4, reps = 10, restSeconds = 90, suggestedKg = 40.0, tempo = "2-0-2", notes = "Codos a 45°", orderIndex = 0,
    )

    private fun valid(input: ExerciseInput) = (input.validate() as ExerciseFormResult.Valid).values
    private fun errors(input: ExerciseInput) = (input.validate() as ExerciseFormResult.Invalid).errors

    @Test fun `kg con coma decimal`() {
        assertEquals(42.5, valid(ExerciseInput(kg = "42,5")).suggestedKg)
    }

    @Test fun `opcionales vacios quedan en null`() {
        val v = valid(ExerciseInput(sets = "3", reps = "12", rest = " ", kg = "", tempo = "", notes = "  "))
        assertEquals(ExerciseValues(3, 12), v)
    }

    @Test fun `series y reps tienen que ser enteros mayores a 0`() {
        val e = errors(ExerciseInput(sets = "0", reps = "diez"))
        assertEquals(setOf(ExerciseField.SETS, ExerciseField.REPS), e.keys)
    }

    @Test fun `descanso negativo o con decimales es error`() {
        assertTrue(ExerciseField.REST in errors(ExerciseInput(rest = "-5")))
        assertTrue(ExerciseField.REST in errors(ExerciseInput(rest = "1,5")))
    }

    @Test fun `tempo de 21 caracteres y notas de 501 son error`() {
        val e = errors(ExerciseInput(tempo = "x".repeat(21), notes = "n".repeat(501)))
        assertEquals(setOf(ExerciseField.TEMPO, ExerciseField.NOTES), e.keys)
    }

    @Test fun `cambiar solo el descanso manda solo esa clave`() {
        val after = valid(before.toInput().copy(rest = "120"))
        val patch = exercisePatch(before, after)!!
        assertEquals("""{"rest_seconds":120}""", patch.toString())
    }

    @Test fun `vaciar un opcional manda null explicito`() {
        val after = valid(before.toInput().copy(tempo = "", kg = ""))
        val patch = exercisePatch(before, after)!!
        assertEquals(setOf("suggested_kg", "tempo"), patch.keys)
        assertEquals(JsonNull, patch["tempo"])
        assertEquals(JsonNull, patch["suggested_kg"])
    }

    @Test fun `sin cambios no hay patch`() {
        assertNull(exercisePatch(before, valid(before.toInput())))
    }

    @Test fun `el kg entero se muestra sin coma y vuelve igual`() {
        assertEquals("40", before.toInput().kg)
        assertEquals(JsonPrimitive(42.5), exercisePatch(before, valid(before.toInput().copy(kg = "42,5")))!!["suggested_kg"])
    }

    @Test fun `campo del backend con prefijo de arreglo`() {
        assertEquals(ExerciseField.SETS, exerciseFieldOf("exercises[0].sets"))
        assertEquals(ExerciseField.REST, exerciseFieldOf("rest_seconds"))
        assertNull(exerciseFieldOf("body"))
    }
}
