package com.fittrainer.data.api.challenges

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ChallengeListResponse(val data: List<ChallengeDto> = emptyList())

/** Un desafío. trainerId null = predefinido (global). En una asignación viene embebido sin trainer_id. */
@Serializable
data class ChallengeDto(
    val id: String,
    @SerialName("trainer_id") val trainerId: String? = null,
    val name: String,
    val description: String? = null,
    @SerialName("goal_type") val goalType: String,
    @SerialName("goal_value") val goalValue: Double,
    @SerialName("duration_days") val durationDays: Int? = null,
    @SerialName("reward_achievement_id") val rewardAchievementId: String? = null,
)

@Serializable
data class AssignmentListResponse(val data: List<AssignmentDto> = emptyList())

@Serializable
data class AssignmentResponse(val data: AssignmentDto)

/** Una asignación a un alumno (toAssignmentView del backend). No trae el student_id. */
@Serializable
data class AssignmentDto(
    val id: String,
    val challenge: ChallengeDto,
    @SerialName("started_at") val startedAt: String,
    @SerialName("ends_at") val endsAt: String,
    @SerialName("current_progress") val currentProgress: Double = 0.0,
    @SerialName("goal_value") val goalValue: Double,
    @SerialName("progress_pct") val progressPct: Double = 0.0,
    val status: String,
    @SerialName("completed_at") val completedAt: String? = null,
)

@Serializable
data class AssignChallengeRequest(@SerialName("challenge_id") val challengeId: String)

@Serializable
data class BatchAssignRequest(@SerialName("student_ids") val studentIds: List<String>)

@Serializable
data class BatchAssignResponse(val data: BatchAssignDto)

/** created va en el orden de student_ids, sin los salteados (el backend los recorre en orden). */
@Serializable
data class BatchAssignDto(
    val created: List<AssignmentDto> = emptyList(),
    val skipped: List<SkippedDto> = emptyList(),
)

/** reason: already_active | not_your_student. */
@Serializable
data class SkippedDto(@SerialName("student_id") val studentId: String, val reason: String)
