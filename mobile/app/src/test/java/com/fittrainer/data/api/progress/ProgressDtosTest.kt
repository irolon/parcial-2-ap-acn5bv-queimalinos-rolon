package com.fittrainer.data.api.progress

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProgressDtosTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test fun parseaLaCurvaDeUnEjercicioDelContrato() {
        val body = """{ "data": {
          "exercise": { "id": "uuid", "name": "Press de banca", "muscle_group": "chest" },
          "points": [
            { "date": "2026-10-20", "max_kg": 62.5, "volume_kg": 1875, "e1rm_kg": 83.3, "sets": 3, "reps": 30 },
            { "date": "2026-10-27", "max_kg": 70, "volume_kg": 1680, "e1rm_kg": 88.7, "sets": 3, "reps": 24 }
          ],
          "pr": { "max_kg": { "value": 70, "date": "2026-10-27" }, "e1rm_kg": { "value": 88.7, "date": "2026-10-27" } },
          "default_metric": "e1rm_kg"
        } }"""
        val data = json.decodeFromString(ExerciseProgressResponse.serializer(), body).data
        assertEquals("Press de banca", data.exercise.name)
        assertEquals(88.7, data.points[1].e1rmKg!!, 0.0)
        assertEquals(1875.0, data.points[0].volumeKg!!, 0.0)
        assertEquals(24, data.points[1].reps)
        assertEquals("2026-10-27", data.pr.e1rmKg?.date)
        assertEquals(70.0, data.pr.maxKg!!.value, 0.0)
        assertEquals("e1rm_kg", data.defaultMetric)
    }

    @Test fun parseaUnEjercicioSinSeriesYPrNulos() {
        val body = """{"data":{"exercise":{"id":"e1","name":"Dominadas"},"points":[],
            "pr":{"max_kg":null,"e1rm_kg":null},"default_metric":"reps"}}"""
        val data = json.decodeFromString(ExerciseProgressResponse.serializer(), body).data
        assertEquals(0, data.points.size)
        assertNull(data.pr.maxKg)
        assertNull(data.pr.e1rmKg)
        assertEquals("reps", data.defaultMetric)
    }

    @Test fun parseaUnPuntoSinKgComoNulos() {
        val body = """{"data":{"exercise":{"id":"e1","name":"Flexiones"},"points":[
            {"date":"2026-10-20","max_kg":null,"volume_kg":0,"e1rm_kg":null,"sets":3,"reps":45}],
            "pr":{"max_kg":null,"e1rm_kg":null},"default_metric":"reps"}}"""
        val point = json.decodeFromString(ExerciseProgressResponse.serializer(), body).data.points.single()
        assertNull(point.maxKg)
        assertNull(point.e1rmKg)
        assertEquals(45, point.reps)
    }

    @Test fun parseaLasMedidasConBmiYCamposNulosIgnorandoElResumen() {
        val body = """{"data":{"points":[
            {"id":"m1","student_id":"s1","weight_kg":80,"height_cm":175,"body_fat_pct":null,"waist_cm":null,"hip_cm":null,
             "chest_cm":null,"recorded_at":"2026-09-01T10:00:00Z","recorded_by":"u1","bmi":26.1},
            {"id":"m2","student_id":"s1","weight_kg":76.5,"height_cm":175,"body_fat_pct":18.2,"waist_cm":82,"hip_cm":95,
             "chest_cm":100,"recorded_at":"2026-10-01T10:00:00Z","recorded_by":"u1","bmi":null}],
            "summary":{"weight_kg":{"first":80,"last":76.5,"delta":-3.5}}}}"""
        val points = json.decodeFromString(BodyProgressResponse.serializer(), body).data.points
        assertEquals(2, points.size)
        assertEquals("2026-09-01T10:00:00Z", points[0].recordedAt)
        assertEquals(26.1, points[0].bmi!!, 0.0)
        assertNull(points[0].bodyFatPct)
        assertEquals(18.2, points[1].bodyFatPct!!, 0.0)
        assertEquals(82.0, points[1].waistCm!!, 0.0)
        assertEquals(95.0, points[1].hipCm!!, 0.0)
        assertEquals(100.0, points[1].chestCm!!, 0.0)
        assertNull(points[1].bmi)
    }

    @Test fun parseaElHistorialDeMedidasVacio() {
        val body = """{"data":{"points":[],"summary":{}}}"""
        assertEquals(0, json.decodeFromString(BodyProgressResponse.serializer(), body).data.points.size)
    }

    /** Mismo Json que NetworkModule (ignoreUnknownKeys): muscle_group y weekly_volume no rompen. */
    @Test fun parseaElOverviewIgnorandoElGrupoMuscularYElVolumenSemanal() {
        val body = """{"data":{"exercises":[
            {"id":"e1","name":"Press de banca","muscle_group":"chest","days":12,"last_date":"2026-10-30"},
            {"id":"e2","name":"Dominadas","muscle_group":null,"days":1,"last_date":"2026-04-02"}],
            "weekly_volume":[{"week_start":"2026-10-26","volume_kg":5400.5,"sessions":3}]}}"""
        val exercises = json.decodeFromString(ProgressOverviewResponse.serializer(), body).data.exercises
        assertEquals(listOf("e1", "e2"), exercises.map { it.id })
        assertEquals("Press de banca", exercises[0].name)
        assertEquals(12, exercises[0].days)
        assertEquals("2026-04-02", exercises[1].lastDate)
    }

    @Test fun parseaElOverviewSinEjercicios() {
        val body = """{"data":{"exercises":[],"weekly_volume":[]}}"""
        assertEquals(0, json.decodeFromString(ProgressOverviewResponse.serializer(), body).data.exercises.size)
    }
}
