package com.fittrainer.data.api.gamification

import com.fittrainer.data.api.CreateSessionResponse
import com.fittrainer.data.api.SessionSetsResponse
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class GamificationDtosTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test fun leeElProgresoComoLoMandaElBackend() {
        val body = """
            {"data":{"streak":{"current_streak_days":6,"longest_streak_days":9,"last_session_date":"2026-10-30"},
             "facts":{"sessions_count":3,"longest_streak":9,"pr_sessions":1,"full_weeks":0},
             "assigned_days":["monday","wednesday"],"achievements":[{"id":"a1","code":"SESSIONS_10","name":"10 sesiones","description":"d","category":"milestone",
               "icon_url":null,"criteria_type":"sessions_count","current":3,"target":10,"unlocked_at":null}]}}
        """.trimIndent()
        val dto = json.decodeFromString<AchievementsProgressResponse>(body).data
        assertEquals(6, dto.streak.currentDays)
        assertEquals("2026-10-30", dto.streak.lastSessionDate)
        assertEquals(1, dto.facts.prSessions)
        assertEquals(listOf("monday", "wednesday"), dto.assignedDays)
        assertEquals("sessions_count", dto.achievements.single().criteriaType)
        assertNull(dto.achievements.single().unlockedAt)
    }

    @Test fun unLogroDesbloqueadoSinNombreNoRompeElCreate() {
        val dto = json.decodeFromString<CreateSessionResponse>("""{"data":{"unlocked_achievements":[{"code":"X"}]}}""").data
        assertEquals("X", dto.unlockedAchievements.single().code)
        assertEquals("", dto.unlockedAchievements.single().name)
    }

    @Test fun leeLosDesafiosDelAlumno() {
        val body = """
            {"data":[{"id":"sc1","challenge":{"id":"c1","name":"12 sesiones en 30 días","description":null,
              "goal_type":"sessions_count","goal_value":12,"duration_days":30,"reward_achievement_id":null},
              "started_at":"2026-10-01T10:00:00.123456+00:00","ends_at":"2026-10-31T10:00:00+00:00",
              "current_progress":3,"goal_value":12,"progress_pct":25,"status":"active","completed_at":null}]}
        """.trimIndent()
        val dto = json.decodeFromString<StudentChallengesResponse>(body).data.single()
        assertEquals("12 sesiones en 30 días", dto.challenge.name)
        assertEquals(25.0, dto.progressPct, 0.0)
        assertEquals("active", dto.status)
    }

    @Test fun leeUnlockedAchievementsDelSyncYLosTomaVaciosSiFaltan() {
        val created = json.decodeFromString<CreateSessionResponse>(
            """{"data":{"id":"s1","unlocked_achievements":[{"code":"FIRST_SESSION","name":"Primera sesión","category":"milestone"}]}}""",
        )
        assertEquals("FIRST_SESSION", created.data.unlockedAchievements.single().code)
        val sets = json.decodeFromString<SessionSetsResponse>("""{"data":{"saved":[],"failed":[]}}""")
        assertEquals(emptyList<Any>(), sets.data.unlockedAchievements)
    }

    /** Contrato de develop (13/11): alumno sin sesiones ni rutina y un logro sin criterio (criteria_type null). */
    @Test fun leeElProgresoSinSesionesNiRutinaConCamposNulos() {
        val body = """
            {"data":{"streak":{"current_streak_days":0,"longest_streak_days":0,"last_session_date":null},
             "facts":{"sessions_count":0,"longest_streak":0,"pr_sessions":0,"full_weeks":0},"assigned_days":[],
             "achievements":[{"id":"a1","code":"X","name":"X","description":null,"category":null,"icon_url":null,
               "criteria_type":null,"current":0,"target":1,"unlocked_at":null}]}}
        """.trimIndent()
        val dto = json.decodeFromString<AchievementsProgressResponse>(body).data
        assertNull(dto.streak.lastSessionDate)
        assertEquals(emptyList<String>(), dto.assignedDays)
        assertNull(dto.achievements.single().criteriaType)
        assertEquals(1, dto.achievements.single().target)
    }

    /** GX4: el cierre de una sesión ya abierta vuelve como reintento (200) con la sesión entera y sus logros. */
    @Test fun leeElCierreDeUnaSesionAbiertaConLaSesionEntera() {
        val body = """
            {"data":{"id":"s1","student_id":"u1","routine_id":null,"started_at":"2026-10-27T10:00:00-03:00",
             "finished_at":"2026-10-27T11:00:00-03:00","rpe":7,"notes":null,"has_modifications":false,
             "unlocked_achievements":[{"code":"STREAK_7","name":"Racha de 7 días","category":"streak"}]}}
        """.trimIndent()
        val unlocked = json.decodeFromString<CreateSessionResponse>(body).data.unlockedAchievements.single()
        assertEquals("STREAK_7", unlocked.code)
        assertEquals("streak", unlocked.category)
    }

    /** weight_target: progreso y meta con decimales (kg). */
    @Test fun leeUnDesafioDePesoConDecimales() {
        val body = """
            {"data":[{"id":"sc1","challenge":{"id":"c1","name":"Bajar a 80","description":"d","goal_type":"weight_target",
              "goal_value":80.5,"duration_days":60,"reward_achievement_id":"a1"},"started_at":"2026-10-01T10:00:00+00:00",
              "ends_at":"2026-11-30T10:00:00+00:00","current_progress":82.3,"goal_value":80.5,"progress_pct":99.9,
              "status":"completed","completed_at":"2026-11-02T10:00:00+00:00"}]}
        """.trimIndent()
        val dto = json.decodeFromString<StudentChallengesResponse>(body).data.single()
        assertEquals(82.3, dto.currentProgress, 0.0)
        assertEquals(80.5, dto.goalValue, 0.0)
        assertEquals("2026-11-02T10:00:00+00:00", dto.completedAt)
    }
}
