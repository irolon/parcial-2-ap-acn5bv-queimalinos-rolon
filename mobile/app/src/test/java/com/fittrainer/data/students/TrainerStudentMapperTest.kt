package com.fittrainer.data.students

import com.fittrainer.data.api.students.OpenSessionDto
import com.fittrainer.data.api.students.StudentListItemDto
import com.fittrainer.testing.fakes.students.studentDto
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import kotlinx.serialization.json.Json
import org.junit.Test

class TrainerStudentMapperTest {

    @Test fun `ida y vuelta conserva fechas y adherencia`() {
        val student = studentDto("s1").toEntity("t1").toDomain()
        assertEquals(Instant.parse("2026-10-30T15:00:00Z"), student.lastSessionAt)
        assertEquals(Instant.parse("2026-09-01T12:00:00Z"), student.createdAt)
        assertEquals(Adherence(3, 2, 67), student.adherence)
        assertEquals(3, student.daysPerWeek)
    }

    @Test fun `la entidad queda con el entrenador como duenio`() {
        assertEquals("t1", studentDto().toEntity("t1").trainerId)
    }

    @Test fun `un backend viejo sin adherence_7d deja la adherencia en null`() {
        assertNull(studentDto(adherence = null).toEntity("t1").toDomain().adherence)
    }

    @Test fun `sin plan la adherencia viene con pct null`() {
        val dto = studentDto(adherence = com.fittrainer.data.api.students.AdherenceDto(0, 0, null))
        assertEquals(Adherence(0, 0, null), dto.toEntity("t1").toDomain().adherence)
    }

    @Test fun `fecha con offset en vez de Z`() {
        val dto = studentDto(lastSessionAt = "2026-10-30T12:00:00-03:00")
        assertEquals(Instant.parse("2026-10-30T15:00:00Z"), dto.toEntity("t1").toDomain().lastSessionAt)
    }

    @Test fun `nunca entreno`() {
        assertNull(studentDto(lastSessionAt = null).toEntity("t1").toDomain().lastSessionAt)
    }

    @Test fun `open_session da el inicio en epoch millis y en Instant`() {
        val dto = studentDto(openSession = OpenSessionDto("o1", "2026-11-13T15:00:00Z"))
        val entity = dto.toEntity("t1")
        assertEquals(Instant.parse("2026-11-13T15:00:00Z").toEpochMilli(), entity.openSessionStartedAt)
        assertEquals(Instant.parse("2026-11-13T15:00:00Z"), entity.toDomain().openSessionStartedAt)
    }

    @Test fun `un JSON sin open_session da null`() {
        val json = """{"id":"s1","name":"A","email":"a@m.com","created_at":"2026-09-01T12:00:00Z"}"""
        val dto = Json { ignoreUnknownKeys = true }.decodeFromString<StudentListItemDto>(json)
        assertNull(dto.openSession)
        assertNull(dto.toEntity("t1").openSessionStartedAt)
        assertNull(dto.toEntity("t1").toDomain().openSessionStartedAt)
    }

    @Test fun `un open_session con fecha ilegible da null`() {
        val dto = studentDto(openSession = OpenSessionDto("o1", "ayer"))
        assertNull(dto.toEntity("t1").openSessionStartedAt)
    }
}
