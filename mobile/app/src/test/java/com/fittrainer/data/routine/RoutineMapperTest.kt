package com.fittrainer.data.routine

import com.fittrainer.data.api.MineResponse
import com.fittrainer.data.db.routine.RoutineEntity
import com.fittrainer.data.db.routine.RoutineExerciseEntity
import com.fittrainer.data.db.routine.RoutineWithExercises
import java.time.DayOfWeek
import java.time.Instant
import java.time.OffsetDateTime
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Test

class RoutineMapperTest {

    private val json = Json { ignoreUnknownKeys = true }

    // Forma real de GET /routines/mine, con un campo que mobile no usa y un ejercicio sin datos.
    private val payload = """
        {"data":[{"routine_id":"rt-1","name":"Push","goal":"hypertrophy","days":["monday","thursday"],
          "created_at":"2026-10-17T03:00:00.123456+00:00","extra":true,
          "exercises":[
            {"routine_exercise_id":"re-2","order_index":1,"sets":3,"reps":12,"rest_seconds":60,
             "suggested_kg":2.5,"tempo":null,"notes":"Controlá la bajada",
             "exercise":{"id":"ex-2","name":"Aperturas","muscle_group":"chest","equipment":"polea","video_url":"https://v/2"}},
            {"routine_exercise_id":"re-1","order_index":0,"sets":null,"reps":null,"rest_seconds":null,
             "suggested_kg":null,"tempo":null,"notes":null,
             "exercise":{"id":"ex-1","name":"Press banca","muscle_group":null,"equipment":null,"video_url":null}},
            {"routine_exercise_id":"re-x","order_index":2,"exercise":null}
          ]}]}
    """.trimIndent()

    // Review Focus 5: formato de Supabase con microsegundos y offset.
    @Test fun `el payload del backend se decodifica y se guarda como entidades`() {
        val dto = json.decodeFromString<MineResponse>(payload).data.single()

        val entity = dto.toEntity()
        assertEquals("monday,thursday", entity.days)
        assertEquals(OffsetDateTime.parse("2026-10-17T03:00:00.123456+00:00").toInstant().toEpochMilli(), entity.createdAt)

        val exercises = dto.toExerciseEntities()
        assertEquals(listOf("re-2", "re-1"), exercises.map { it.id }) // el ejercicio sin datos se descarta
        assertEquals(2.5, exercises.first().suggestedKg)
        assertEquals("rt-1", exercises.first().routineId)
    }

    @Test fun `created_at ilegible o ausente queda en 0`() {
        assertEquals(0L, parseCreatedAt("ayer"))
        assertEquals(0L, parseCreatedAt(null))
    }

    @Test fun `toDomain ordena los ejercicios y lee los dias`() {
        val row = RoutineWithExercises(
            RoutineEntity("rt-1", "Push", null, "monday,funday", 42L),
            listOf(exercise("re-2", order = 1), exercise("re-1", order = 0)),
        )
        val routine = row.toDomain()
        assertEquals(setOf(DayOfWeek.MONDAY), routine.days)
        assertEquals(Instant.ofEpochMilli(42L), routine.createdAt)
        assertEquals(listOf("re-1", "re-2"), routine.exercises.map { it.id })
    }

    @Test fun `rutina sin dias queda con el set vacio`() {
        val row = RoutineWithExercises(RoutineEntity("rt-1", "Push", null, "", 0L), emptyList())
        assertEquals(emptySet<DayOfWeek>(), row.toDomain().days)
    }

    private fun exercise(id: String, order: Int) = RoutineExerciseEntity(
        id, "rt-1", "ex-$id", "Press", null, null, null, 4, 8, 90, null, null, null, order,
    )
}
