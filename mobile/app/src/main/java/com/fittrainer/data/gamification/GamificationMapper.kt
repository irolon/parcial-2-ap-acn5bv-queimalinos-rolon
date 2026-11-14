package com.fittrainer.data.gamification

import com.fittrainer.data.api.UnlockedAchievementDto
import com.fittrainer.data.api.gamification.AchievementProgressDto
import com.fittrainer.data.api.gamification.AchievementsProgressDto
import com.fittrainer.data.api.gamification.StudentChallengeDto
import com.fittrainer.data.db.gamification.AchievementProgressEntity
import com.fittrainer.data.db.gamification.CELEBRATION_PENDING
import com.fittrainer.data.db.gamification.CelebrationEntity
import com.fittrainer.data.db.gamification.GamificationSnapshotEntity
import com.fittrainer.data.db.gamification.StudentChallengeEntity
import com.fittrainer.data.routine.parseDays
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime

/** Supabase manda "+00:00" y microsegundos: OffsetDateTime los acepta, igual que "Z". */
private fun millis(raw: String?): Long? = raw?.let { runCatching { OffsetDateTime.parse(it).toInstant().toEpochMilli() }.getOrNull() }

/** Los días asignados se guardan separados por coma (como RoutineEntity.days) y se leen con el mismo parser que las rutinas. */
fun AchievementsProgressDto.toSnapshotEntity(ownerId: String, fetchedAt: Long) = GamificationSnapshotEntity(
    ownerId, streak.currentDays, streak.longestDays, streak.lastSessionDate, facts.sessionsCount, facts.prSessions, facts.fullWeeks, fetchedAt,
    assignedDays.joinToString(","),
)

fun AchievementProgressDto.toEntity(ownerId: String, position: Int) = AchievementProgressEntity(
    ownerId, code, id, name, description, category, criteriaType, current, target, millis(unlockedAt), position,
)

fun StudentChallengeDto.toEntity(ownerId: String) = StudentChallengeEntity(
    id, ownerId, challenge.name, challenge.description, challenge.goalType, goalValue, currentProgress, progressPct, status,
    millis(startedAt) ?: 0L, millis(endsAt) ?: 0L, millis(completedAt),
)

fun GamificationSnapshotEntity.toDomain() = Snapshot(
    currentStreak, longestStreak, lastSessionDate?.let { runCatching { LocalDate.parse(it) }.getOrNull() },
    sessionsCount, prSessions, fullWeeks, fetchedAt, parseDays(assignedDays.split(',')),
)

fun AchievementProgressEntity.toDomain() =
    Achievement(code, name, description, category, criteriaType, current, target, unlockedAt?.let(Instant::ofEpochMilli))

fun StudentChallengeEntity.toDomain() = Challenge(
    id, name, description, goalType, goalValue, currentProgress, progressPct, status,
    Instant.ofEpochMilli(startedAt), Instant.ofEpochMilli(endsAt), completedAt?.let(Instant::ofEpochMilli),
)

fun AchievementProgressEntity.toCelebration(now: Long) = CelebrationEntity(ownerId, code, name, description, category, CELEBRATION_PENDING, now)

fun CelebrationEntity.toDomain() = Celebration(code, name, description, category)

fun UnlockedAchievementDto.toDomain() = UnlockedAchievement(code, name, category)
