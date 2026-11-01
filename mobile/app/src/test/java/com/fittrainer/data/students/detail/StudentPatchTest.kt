package com.fittrainer.data.students.detail

import com.fittrainer.data.db.students.TrainerStudentDetailEntity
import com.fittrainer.testing.fakes.students.detailDto
import java.time.LocalDate
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class StudentPatchTest {

    private val before = detailDto().toEntity("t1", 0).let(TrainerStudentDetailEntity::toDomain)
    private val today = LocalDate.of(2026, 11, 1)

    @Test fun `sin cambios no hay patch`() {
        assertNull(diffPatch(before, before.toEditable()))
    }

    @Test fun `solo lesiones manda solo esa clave`() {
        val patch = diffPatch(before, before.toEditable().copy(injuries = "Rodilla"))!!
        assertEquals(setOf("injuries"), patch.keys)
        assertEquals(JsonPrimitive("Rodilla"), patch["injuries"])
    }

    @Test fun `borrar lesiones manda null explicito y no un texto vacio`() {
        val patch = diffPatch(before, before.toEditable().copy(injuries = "   "))!!
        assertEquals(JsonNull, patch["injuries"])
        assertEquals("""{"injuries":null}""", patch.toString())
    }

    @Test fun `borrar fecha y equipamiento manda null`() {
        val patch = diffPatch(before, before.toEditable().copy(birthDate = null, equipment = emptyList()))!!
        assertEquals(JsonNull, patch["birth_date"])
        assertEquals(JsonNull, patch["gym_equipment"])
        assertEquals(setOf("birth_date", "gym_equipment"), patch.keys)
    }

    @Test fun `nombre recortado igual al anterior no cuenta como cambio`() {
        assertNull(diffPatch(before, before.toEditable().copy(name = "  Tomás Rivera ")))
    }

    @Test fun `fecha futura y nombre corto son errores`() {
        val errors = before.toEditable().copy(name = "T", birthDate = today.plusDays(1)).errors(today)
        assertEquals(setOf(EditField.NAME, EditField.BIRTH_DATE), errors.keys)
        assertTrue(before.toEditable().copy(birthDate = today).errors(today).isEmpty())
    }

    @Test fun `baja y reactivacion`() {
        assertEquals("""{"active":false}""", activePatch(false).toString())
        assertEquals("""{"active":true}""", activePatch(true).toString())
    }
}
