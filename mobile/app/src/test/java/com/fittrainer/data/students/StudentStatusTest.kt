package com.fittrainer.data.students

import com.fittrainer.testing.fakes.students.trainerStudent
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StudentStatusTest {

    private val today = LocalDate.of(2026, 11, 10)

    /** Mediodía argentino del día [day] de noviembre. */
    private fun nov(day: Int) = Instant.parse("2026-11-%02dT15:00:00Z".format(day))

    @Test fun `entreno hace 6 dias esta al dia y hace 7 esta en riesgo`() {
        assertEquals(StudentStatus.ACTIVE, trainerStudent(lastSessionAt = nov(4)).status(today))
        assertEquals(StudentStatus.INACTIVE, trainerStudent(lastSessionAt = nov(3)).status(today))
    }

    @Test fun `nunca entreno con 6 dias de alta es nuevo y con 7 esta en riesgo`() {
        assertEquals(StudentStatus.NEW, trainerStudent(lastSessionAt = null, createdAt = nov(4)).status(today))
        assertEquals(StudentStatus.INACTIVE, trainerStudent(lastSessionAt = null, createdAt = nov(3)).status(today))
    }

    @Test fun `dado de baja gana sobre todo`() {
        assertEquals(StudentStatus.DISABLED, trainerStudent(active = false, lastSessionAt = nov(9)).status(today))
        assertEquals(StudentStatus.DISABLED, trainerStudent(active = false, lastSessionAt = null).status(today))
    }

    @Test fun `una sesion a las 23 30 argentinas cuenta para ese dia`() {
        // 2026-11-04 23:30 en Argentina = 2026-11-05 02:30Z.
        val late = Instant.parse("2026-11-05T02:30:00Z")
        assertEquals(6, trainerStudent(lastSessionAt = late).daysWithoutTraining(today))
    }

    @Test fun `ALL excluye a los dados de baja`() {
        assertTrue(trainerStudent().matches(StudentFilter.ALL, today))
        assertFalse(trainerStudent(active = false).matches(StudentFilter.ALL, today))
        assertTrue(trainerStudent(active = false).matches(StudentFilter.DISABLED, today))
    }

    @Test fun `NEW coincide con la etiqueta - el que nunca entreno y ya esta en riesgo va solo en riesgo`() {
        val old = trainerStudent(lastSessionAt = null, createdAt = Instant.parse("2026-01-01T12:00:00Z"))
        assertFalse(old.matches(StudentFilter.NEW, today))
        assertTrue(old.matches(StudentFilter.AT_RISK, today))
        assertTrue(trainerStudent(lastSessionAt = null, createdAt = Instant.parse("2026-11-08T12:00:00Z")).matches(StudentFilter.NEW, today))
        assertFalse(trainerStudent(lastSessionAt = nov(9)).matches(StudentFilter.NEW, today))
    }

    @Test fun `ACTIVE y AT_RISK separan por los dias sin entrenar`() {
        val ok = trainerStudent(lastSessionAt = nov(9))
        val risk = trainerStudent(lastSessionAt = nov(1))
        assertTrue(ok.matches(StudentFilter.ACTIVE, today))
        assertFalse(ok.matches(StudentFilter.AT_RISK, today))
        assertTrue(risk.matches(StudentFilter.AT_RISK, today))
        assertFalse(risk.matches(StudentFilter.ACTIVE, today))
    }

    @Test fun `la busqueda ignora tildes y mayusculas`() {
        val jose = trainerStudent(name = "José Pérez")
        assertTrue(jose.matchesQuery("jose"))
        assertTrue(jose.matchesQuery("PEREZ"))
        assertTrue(jose.matchesQuery("  josé "))
        assertTrue(jose.matchesQuery(""))
        assertFalse(jose.matchesQuery("ana"))
        assertTrue(trainerStudent(name = "Jose").matchesQuery("José"))
    }
}
