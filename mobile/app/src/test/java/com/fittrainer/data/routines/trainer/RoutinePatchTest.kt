package com.fittrainer.data.routines.trainer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RoutinePatchTest {

    private val before = TrainerRoutineSummary(
        id = "r1", studentId = "s1", name = "Push", goal = "hypertrophy",
        days = listOf("monday", "thursday"), active = true, createdAt = null,
    )

    @Test fun `sin dias es error`() {
        assertTrue(RoutineField.DAYS in RoutineHeaderInput("Push", "hypertrophy", emptySet()).errors())
    }

    @Test fun `nombre de 1 caracter y sin objetivo son error`() {
        assertEquals(setOf(RoutineField.NAME, RoutineField.GOAL), RoutineHeaderInput("P", null, setOf("monday")).errors().keys)
    }

    @Test fun `valido no tiene errores`() {
        assertTrue(before.toHeaderInput().errors().isEmpty())
    }

    @Test fun `los dias van en orden de la semana`() {
        val patch = headerPatch(before, before.toHeaderInput().copy(days = setOf("friday", "monday")))!!
        assertEquals("""{"days":["monday","friday"]}""", patch.toString())
    }

    @Test fun `el mismo conjunto de dias en otro orden no cambia nada`() {
        val reversed = before.copy(days = listOf("thursday", "monday"))
        assertNull(headerPatch(reversed, before.toHeaderInput()))
    }

    @Test fun `el nombre se manda recortado y solo si cambio`() {
        assertNull(headerPatch(before, before.toHeaderInput().copy(name = "  Push ")))
        assertEquals("""{"name":"Pull"}""", headerPatch(before, before.toHeaderInput().copy(name = " Pull "))!!.toString())
    }

    @Test fun `activar y desactivar`() {
        assertEquals("""{"active":false}""", routineActivePatch(false).toString())
    }

    @Test fun `el nivel se manda al cambiar y null explicito al quitarlo`() {
        assertEquals("""{"level":"advanced"}""", headerPatch(before, before.toHeaderInput().copy(level = "advanced"))!!.toString())
        val withLevel = before.copy(level = "advanced")
        assertEquals("""{"level":null}""", headerPatch(withLevel, withLevel.toHeaderInput().copy(level = null))!!.toString())
        assertNull(headerPatch(withLevel, withLevel.toHeaderInput()))
    }

    @Test fun `el nivel no se valida y el campo del backend se mapea`() {
        assertTrue(before.toHeaderInput().copy(level = "cualquiera").errors().isEmpty())
        assertEquals(RoutineField.LEVEL, routineFieldOf("level"))
    }
}
