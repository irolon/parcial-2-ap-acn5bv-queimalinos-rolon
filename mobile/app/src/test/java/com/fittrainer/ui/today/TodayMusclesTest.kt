package com.fittrainer.ui.today

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.data.routine.TodayContent
import com.fittrainer.data.workout.MAX_SET_NUMBER
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TodayMusclesTest {

    private fun re(name: String, group: String?, sets: Int?) =
        RoutineExercise(name, "x-$name", name, group, null, null, sets, 8, 90, null, null, null)

    private fun routine(vararg e: RoutineExercise) = Routine("r", "Empuje", null, emptySet(), Instant.EPOCH, e.toList())

    @Test fun `agrupa en orden de aparicion y suma series`() {
        val g = todayMuscles(routine(re("Banca", "chest", 4), re("Militar", "shoulders", null), re("Inclinado", "chest", 3)))
        assertEquals(listOf("chest", "shoulders"), g.map { it.group })
        assertEquals(listOf("Banca", "Inclinado"), g[0].exercises)
        assertEquals(7, g[0].sets)
        assertEquals(3, g[1].sets) // DEFAULT_SETS
        assertEquals("Pecho", g[0].label)
    }

    @Test fun `las series se acotan igual que en la sesion`() {
        assertEquals(1, todayMuscles(routine(re("a", "chest", 0)))[0].sets)
        assertEquals(MAX_SET_NUMBER, todayMuscles(routine(re("a", "chest", 500)))[0].sets)
    }

    @Test fun `sin grupo, desconocido y cardio no cuentan`() {
        assertTrue(todayMuscles(routine(re("Bici", "cardio", 1), re("Nuevo", "yoga", 2), re("Otro", null, 3))).isEmpty())
    }

    @Test fun `texto de la fila con mas de tres grupos`() {
        val g = todayMuscles(routine(re("a", "chest", 1), re("b", "back", 1), re("c", "shoulders", 1), re("d", "legs", 1), re("e", "core", 1)))
        assertEquals("Pecho · Espalda · Hombros +2", musclesRowText(g))
        assertEquals("Pecho", musclesRowText(g.take(1)))
    }

    @Test fun `partes pintadas de la rutina`() {
        val g = todayMuscles(routine(re("a", "chest", 1), re("b", "triceps", 1)))
        assertEquals(setOf("chest", "triceps"), paintedParts(g))
    }

    @Test fun `la hoja solo se muestra abierta, con entrenamiento y con musculos`() {
        val r = routine(re("a", "chest", 1))
        assertEquals(r, musclesSheetRoutine(TodayContent.Training(r), true))
        assertNull(musclesSheetRoutine(TodayContent.Training(r), false))
        assertNull(musclesSheetRoutine(TodayContent.Rest(r, emptySet(), null), true))
        assertNull(musclesSheetRoutine(TodayContent.NoRoutine, true))
        assertNull(musclesSheetRoutine(null, true))
        assertNull(musclesSheetRoutine(TodayContent.Training(routine(re("Bici", "cardio", 1))), true))
    }
}
