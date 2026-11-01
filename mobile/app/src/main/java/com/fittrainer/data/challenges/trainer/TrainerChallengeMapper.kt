package com.fittrainer.data.challenges.trainer

import com.fittrainer.data.api.challenges.AssignmentDto
import com.fittrainer.data.api.challenges.ChallengeDto
import com.fittrainer.data.db.challenges.trainer.TrainerChallengeEntity
import com.fittrainer.data.db.challenges.trainer.TrainerStudentChallengeEntity
import java.time.Instant
import java.time.OffsetDateTime

private fun millis(iso: String): Long = OffsetDateTime.parse(iso).toInstant().toEpochMilli()

fun ChallengeDto.toEntity(trainerId: String, position: Int) = TrainerChallengeEntity(
    trainerId, id, name, description, goalType, goalValue, durationDays, rewardAchievementId,
    own = this.trainerId != null, position = position,
)

fun AssignmentDto.toEntity(trainerId: String, studentId: String) = TrainerStudentChallengeEntity(
    trainerId, studentId, id, challenge.id, challenge.name, challenge.goalType, goalValue, currentProgress,
    progressPct, status, millis(startedAt), millis(endsAt), completedAt?.let(::millis),
)

fun TrainerChallengeEntity.toDomain() =
    Challenge(id, name, description, goalType, goalValue, durationDays, hasReward = rewardAchievementId != null, own = own)

fun TrainerStudentChallengeEntity.toDomain() = StudentChallenge(
    id, challengeId, name, goalType, goalValue, currentProgress, progressPct, status,
    Instant.ofEpochMilli(startedAt), Instant.ofEpochMilli(endsAt), completedAt?.let(Instant::ofEpochMilli),
)
