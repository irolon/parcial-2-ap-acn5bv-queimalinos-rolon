package com.fittrainer.data.db.challenges.trainer

import androidx.room.Entity

/** Desafío visible para el entrenador (E14). own: lo creó él (si no, es predefinido). position: orden del backend. */
@Entity(tableName = "trainer_challenges", primaryKeys = ["trainerId", "id"])
data class TrainerChallengeEntity(
    val trainerId: String,
    val id: String,
    val name: String,
    val description: String?,
    val goalType: String,
    val goalValue: Double,
    val durationDays: Int?,
    val rewardAchievementId: String?,
    val own: Boolean,
    val position: Int,
)

/** Cuándo se bajó la lista de desafíos (sin fila = nunca). */
@Entity(tableName = "trainer_challenges_sync", primaryKeys = ["trainerId"])
data class TrainerChallengesSyncEntity(
    val trainerId: String,
    val fetchedAt: Long,
)

/** Una asignación de un desafío a un alumno, con su avance. Fechas en epoch millis. */
@Entity(tableName = "trainer_student_challenges", primaryKeys = ["trainerId", "id"])
data class TrainerStudentChallengeEntity(
    val trainerId: String,
    val studentId: String,
    val id: String,
    val challengeId: String,
    val name: String,
    val goalType: String,
    val goalValue: Double,
    val currentProgress: Double,
    val progressPct: Double,
    val status: String,
    val startedAt: Long,
    val endsAt: Long,
    val completedAt: Long?,
)

/** Cuándo se bajaron los desafíos de un alumno (sin fila = nunca). */
@Entity(tableName = "trainer_student_challenges_sync", primaryKeys = ["trainerId", "studentId"])
data class TrainerStudentChallengesSyncEntity(
    val trainerId: String,
    val studentId: String,
    val fetchedAt: Long,
)
