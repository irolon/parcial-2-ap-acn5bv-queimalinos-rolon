package com.fittrainer.data.api.history

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class HistoryDtosTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test fun parseaUnaPaginaConLosNulosDelContrato() {
        val body = """{"data":[{"id":"s1","started_at":"2026-10-29T12:00:00Z","finished_at":null,"duration_min":null,
            "routine":null,"rpe":null,"notes":null,"trainer_comment":null,"has_modifications":false,"sets":0,
            "volume_kg":0,"has_pr":false}],"meta":{"total":21,"page":1,"limit":20,"total_pages":2}}"""
        val page = json.decodeFromString(HistoryPageDto.serializer(), body)
        assertNull(page.data.single().routine)
        assertEquals(2, page.meta.totalPages)
    }

    @Test fun parseaElDetalleConReemplazoYPlanParcial() {
        val body = """{"data":{"id":"s1","started_at":"2026-10-29T12:00:00Z","finished_at":"2026-10-29T12:54:00Z",
            "duration_min":54,"routine":{"id":"r1","name":"Push"},"rpe":8,"notes":"bien","trainer_comment":"Muy bien",
            "has_modifications":true,"sets":1,"volume_kg":625,"has_pr":true,"exercises":[{"exercise":{"id":"e1","name":"Press"},
            "original_exercise":{"id":"e2","name":"Press con mancuernas"},"planned":{"sets":4,"reps":null,"suggested_kg":60},
            "is_pr":true,"sets":[{"id":"x1","set_number":1,"actual_reps":10,"actual_kg":62.5,"completed":true,
            "executed_at":"2026-10-29T12:10:00Z"}]}]}}"""
        val detail = json.decodeFromString(HistoryDetailResponse.serializer(), body).data
        val exercise = detail.exercises.single()
        assertEquals("Press con mancuernas", exercise.originalExercise?.name)
        assertNull(exercise.planned?.reps)
        assertEquals(62.5, exercise.sets.single().actualKg!!, 0.0)
    }
}
