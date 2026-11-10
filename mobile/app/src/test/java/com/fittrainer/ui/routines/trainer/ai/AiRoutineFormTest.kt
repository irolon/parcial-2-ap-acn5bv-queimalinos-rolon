package com.fittrainer.ui.routines.trainer.ai

import com.fittrainer.data.students.detail.ActiveRoutine
import com.fittrainer.data.students.detail.StudentDetail
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** E15: el formulario precargado de la ficha y lo que viaja. */
class AiRoutineFormTest {
    private fun detail(goal: String? = "strength", level: String? = "beginner", days: List<String>? = listOf("monday", "thursday"), injuries: String? = "Rodilla") =
        StudentDetail("s1", "Ana", "a@b.c", goal, level, null, true, listOf("Mancuernas"), injuries, Instant.EPOCH, null, null, days?.let { ActiveRoutine("Push", it) })

    @Test fun `precarga objetivo, nivel, dias de la rutina activa y lesiones`() {
        val f = AiRoutineForm().prefill(detail())
        assertEquals("strength", f.goal)
        assertEquals("beginner", f.level)
        assertEquals(2, f.daysPerWeek)
        assertEquals("Rodilla", f.injuries)
        assertNull(f.equipment)
        assertTrue(f.prefilled)
    }

    @Test fun `sin rutina activa son 3 dias y un objetivo desconocido queda sin elegir`() {
        val f = AiRoutineForm().prefill(detail(goal = "otro", level = null, days = null, injuries = null))
        assertNull(f.goal)
        assertNull(f.level)
        assertEquals(DEFAULT_DAYS, f.daysPerWeek)
        assertEquals("", f.injuries)
    }

    @Test fun `sin objetivo ni nivel hay errores en esos campos`() {
        assertEquals(setOf(AiField.GOAL, AiField.LEVEL), AiRoutineForm().errors().keys)
    }

    @Test fun `los parametros llevan el equipamiento tal cual`() {
        val base = AiRoutineForm(goal = "strength", level = "beginner")
        assertNull(base.toParams("s1").equipment)
        assertEquals(emptyList<String>(), base.copy(equipment = emptyList()).toParams("s1").equipment)
        assertEquals(listOf("barbell"), base.copy(equipment = listOf("barbell")).toParams("s1").equipment)
    }

    @Test fun `los campos del backend van a su campo`() {
        assertEquals(AiField.DAYS, aiFieldOf("frequency_per_week"))
        assertEquals(AiField.EQUIPMENT, aiFieldOf("available_equipment"))
        assertNull(aiFieldOf("student_id"))
    }
}
