package com.fittrainer.ui.students.detail

import com.fittrainer.data.db.students.TrainerStudentDetailEntity
import com.fittrainer.data.students.detail.toDomain
import com.fittrainer.data.students.detail.toEntity
import com.fittrainer.testing.fakes.students.detailDto
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class StudentDetailTextsTest {

    private val detail = detailDto().toEntity("t1", 0).let(TrainerStudentDetailEntity::toDomain)

    @Test fun `edad el dia del cumple, el dia antes y un 29 de febrero`() {
        val birth = LocalDate.of(2000, 11, 1)
        assertEquals(26, ageOn(birth, LocalDate.of(2026, 11, 1)))
        assertEquals(25, ageOn(birth, LocalDate.of(2026, 10, 31)))
        val leap = LocalDate.of(2000, 2, 29)
        assertEquals(26, ageOn(leap, LocalDate.of(2027, 2, 28)))
        assertEquals(27, ageOn(leap, LocalDate.of(2027, 3, 1)))
        assertEquals(28, ageOn(leap, LocalDate.of(2028, 2, 29)))
    }

    @Test fun `cabecera completa y con datos faltantes`() {
        val today = LocalDate.of(2026, 11, 1)
        assertEquals("27 AÑOS · GANAR FUERZA · 2 D/SEM", headerLine(detail, today))
        assertEquals("GANAR FUERZA · 2 D/SEM", headerLine(detail.copy(birthDate = null), today))
        assertEquals("", headerLine(detail.copy(birthDate = null, goal = null, activeRoutine = null), today))
    }

    @Test fun `numeros con coma y sin decimales de mas`() {
        assertEquals("74,5", number(74.5))
        assertEquals("178", number(178.0))
        assertEquals(EMPTY_VALUE, number(null))
        assertEquals(listOf("PESO" to "74,5 kg", "ALTURA" to "178 cm", "IMC" to "23,5", "GRASA" to EMPTY_VALUE), metricValues(detail.latestMetrics!!))
    }
}
