package com.fittrainer.data.api.gamification

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** GET /students/:id/achievements/progress (tarjeta 15): racha, datos y progreso de cada logro del catálogo. */
@Serializable
data class AchievementsProgressResponse(val data: AchievementsProgressDto)

@Serializable
data class AchievementsProgressDto(
    val streak: StreakDto,
    val facts: FactsDto,
    val achievements: List<AchievementProgressDto>,
    /** Días con los que el servidor calculó la racha ("monday"…); vacío = sin rutina. */
    @SerialName("assigned_days") val assignedDays: List<String> = emptyList(),
)

@Serializable
data class StreakDto(
    @SerialName("current_streak_days") val currentDays: Int,
    @SerialName("longest_streak_days") val longestDays: Int,
    @SerialName("last_session_date") val lastSessionDate: String? = null,
)

@Serializable
data class FactsDto(
    @SerialName("sessions_count") val sessionsCount: Int,
    @SerialName("longest_streak") val longestStreak: Int,
    @SerialName("pr_sessions") val prSessions: Int,
    @SerialName("full_weeks") val fullWeeks: Int,
)

@Serializable
data class AchievementProgressDto(
    val id: String,
    val code: String,
    val name: String,
    val description: String? = null,
    val category: String? = null,
    @SerialName("criteria_type") val criteriaType: String? = null,
    val current: Int,
    val target: Int,
    @SerialName("unlocked_at") val unlockedAt: String? = null,
)

/** GET /students/:id/challenges: las asignaciones del alumno, la más nueva primero. */
@Serializable
data class StudentChallengesResponse(val data: List<StudentChallengeDto>)

@Serializable
data class StudentChallengeDto(
    val id: String,
    val challenge: ChallengeDto,
    @SerialName("started_at") val startedAt: String,
    @SerialName("ends_at") val endsAt: String,
    @SerialName("current_progress") val currentProgress: Double,
    @SerialName("goal_value") val goalValue: Double,
    @SerialName("progress_pct") val progressPct: Double,
    val status: String,
    @SerialName("completed_at") val completedAt: String? = null,
)

@Serializable
data class ChallengeDto(
    val id: String,
    val name: String,
    val description: String? = null,
    @SerialName("goal_type") val goalType: String? = null,
)
