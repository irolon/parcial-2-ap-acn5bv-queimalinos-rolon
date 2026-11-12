package com.fittrainer.data.api.trainerai

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** E15: el contrato de /trainer-ai con el Json de la app (ignoreUnknownKeys, sin defaults). */
class TrainerAiDtosTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test fun `el equipamiento sin tocar no viaja y las lesiones vacias viajan como null`() {
        val body = json.encodeToString(GenerateRoutineRequest("s1", "strength", "beginner", 3, 60, null, JsonNull))
        assertFalse(body.contains("available_equipment"))
        assertTrue(body.contains("\"injuries\":null"))
        assertFalse(body.contains("preferences"))
    }

    @Test fun `sin lesiones (ficha sin cargar) el campo no viaja`() {
        val body = json.encodeToString(GenerateRoutineRequest("s1", "strength", "beginner", 3, 60, null, null))
        assertFalse(body.contains("injuries"))
    }

    @Test fun `una lista vacia de equipamiento viaja vacia`() {
        val body = json.encodeToString(GenerateRoutineRequest("s1", "strength", "beginner", 3, 60, emptyList(), JsonPrimitive("Rodilla")))
        assertTrue(body.contains("\"available_equipment\":[]"))
        assertTrue(body.contains("\"injuries\":\"Rodilla\""))
    }

    @Test fun `lee una propuesta de varios bloques`() {
        val raw = """{"data":{"generation_id":"g1","routine_proposal":{"rationale":"Split","routines":[
            {"name":"Pecho","days":["monday"],"exercises":[{"exercise_id":"e1","exercise_name":"Press","sets":4,"reps":8,
            "rest_seconds":90,"suggested_kg":null,"notes":null,"extra":1}]},
            {"name":"Piernas","days":["friday","wednesday"],"exercises":[{"exercise_id":"e2","sets":3,"reps":10,"rest_seconds":60}]}]}}}"""
        val dto = json.decodeFromString<GenerateRoutineResponse>(raw).data
        assertEquals("g1", dto.generationId)
        assertEquals(listOf("Pecho", "Piernas"), dto.proposal.routines.map { it.name })
        assertEquals("Press", dto.proposal.routines[0].exercises[0].exerciseName)
        assertNull(dto.proposal.routines[1].exercises[0].exerciseName)
    }

    @Test fun `lee las plantillas guardadas`() {
        val raw = """{"data":{"generation_id":"g1","templates":[{"id":"t1","name":"IA · Pecho","days":["monday"]}]}}"""
        assertEquals("t1", json.decodeFromString<SaveAsTemplateResponse>(raw).data.templates.single().id)
    }
}
