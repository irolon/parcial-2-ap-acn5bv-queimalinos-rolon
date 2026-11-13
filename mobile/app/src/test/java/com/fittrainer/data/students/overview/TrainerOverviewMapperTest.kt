package com.fittrainer.data.students.overview

import com.fittrainer.data.api.students.OverviewDto
import java.time.Instant
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainerOverviewMapperTest {

    private val json = Json { ignoreUnknownKeys = true }

    private fun overview(raw: String) = json.decodeFromString<OverviewDto>(raw).toDomain()

    @Test fun `in_session con dos alumnos`() {
        val o = overview(
            """{"in_session":[
                {"student_id":"s1","name":"Ana Pérez","session_id":"x1","routine_name":"Pierna","started_at":"2026-11-13T15:00:00.000Z"},
                {"student_id":"s2","name":"Beto","session_id":"x2","routine_name":null,"started_at":"2026-11-13T12:30:00-03:00"}
            ]}""",
        )
        assertEquals(
            listOf(
                InSessionItem("s1", "Ana Pérez", "Pierna", Instant.parse("2026-11-13T15:00:00Z")),
                InSessionItem("s2", "Beto", null, Instant.parse("2026-11-13T15:30:00Z")),
            ),
            o.inSession,
        )
    }

    @Test fun `un json sin in_session da lista vacia`() {
        assertTrue(overview("{}").inSession.isEmpty())
    }

    @Test fun `nombre nulo pasa a Alumno y un started_at ilegible descarta el item`() {
        val o = overview(
            """{"in_session":[
                {"student_id":"s1","name":null,"session_id":"x1","started_at":"2026-11-13T15:00:00Z"},
                {"student_id":"s2","name":"Roto","session_id":"x2","started_at":"ayer"}
            ]}""",
        )
        assertEquals(listOf(InSessionItem("s1", "Alumno", null, Instant.parse("2026-11-13T15:00:00Z"))), o.inSession)
    }
}
