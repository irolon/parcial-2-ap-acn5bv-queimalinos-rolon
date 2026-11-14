package com.fittrainer.testing.fakes.gamification

import com.fittrainer.data.api.gamification.AchievementProgressDto
import com.fittrainer.data.api.gamification.AchievementsProgressDto
import com.fittrainer.data.api.gamification.ChallengeDto
import com.fittrainer.data.api.gamification.FactsDto
import com.fittrainer.data.api.gamification.StreakDto
import com.fittrainer.data.api.gamification.StudentChallengeDto

fun achievementDto(code: String, type: String, current: Int, target: Int, unlockedAt: String? = null) =
    AchievementProgressDto(id = "id-$code", code = code, name = "Logro $code", description = "Descripción $code",
        category = if (type == "streak") "streak" else "milestone", criteriaType = type, current = current, target = target, unlockedAt = unlockedAt)

/** Fecha vieja de desbloqueo (anterior a cualquier foto de los tests). */
const val OLD_UNLOCK = "2026-10-01T10:00:00+00:00"

/**
 * Catálogo chico: una de cada tipo que importa para la cuenta local. Como el servidor, lo que ya llegó a su meta
 * viene desbloqueado (con [OLD_UNLOCK]) salvo que [unlocked] diga otra fecha.
 */
fun catalog(sessions: Int = 0, longest: Int = 0, unlocked: Map<String, String> = emptyMap()): List<AchievementProgressDto> {
    fun dto(code: String, type: String, current: Int, target: Int) =
        achievementDto(code, type, current, target, unlocked[code] ?: OLD_UNLOCK.takeIf { current >= target })
    return listOf(
        dto("FIRST_SESSION", "sessions_count", minOf(sessions, 1), 1),
        dto("SESSIONS_10", "sessions_count", minOf(sessions, 10), 10),
        dto("STREAK_7_DAYS", "streak", minOf(longest, 7), 7),
        achievementDto("FIRST_PR", "pr_count", 0, 1, unlocked["FIRST_PR"]),
        achievementDto("CHALLENGE_DONE", "challenge", 0, 1, unlocked["CHALLENGE_DONE"]),
    )
}

fun progressDto(
    sessions: Int = 0,
    current: Int = 0,
    longest: Int = 0,
    last: String? = null,
    unlocked: Map<String, String> = emptyMap(),
    assignedDays: List<String> = emptyList(),
) = AchievementsProgressDto(
    streak = StreakDto(current, longest, last),
    facts = FactsDto(sessions, longest, 0, 0),
    achievements = catalog(sessions, longest, unlocked),
    assignedDays = assignedDays,
)

fun challengeDto(id: String = "sc1", status: String = "active", current: Double = 3.0, goal: Double = 12.0) = StudentChallengeDto(
    id = id, challenge = ChallengeDto("c-$id", "12 sesiones en 30 días", null, "sessions_count"),
    startedAt = "2026-10-20T10:00:00+00:00", endsAt = "2026-11-19T10:00:00+00:00",
    currentProgress = current, goalValue = goal, progressPct = current / goal * 100, status = status,
)
