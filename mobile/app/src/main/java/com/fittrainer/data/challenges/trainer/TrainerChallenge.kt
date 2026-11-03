package com.fittrainer.data.challenges.trainer

import java.time.Instant

/** Tipos de meta del backend (models/gamification GOAL_TYPE). */
const val GOAL_SESSIONS = "sessions_count"
const val GOAL_WEIGHT = "weight_target"
const val GOAL_STREAK = "streak"
const val GOAL_VOLUME = "volume"

/** Estados de una asignación (CHALLENGE_STATUS). */
const val STATUS_ACTIVE = "active"
const val STATUS_COMPLETED = "completed"
const val STATUS_FAILED = "failed"
const val STATUS_ABANDONED = "abandoned"

/** Desafío de la lista. own: lo creó el entrenador (en la web); si no, es predefinido. */
data class Challenge(
    val id: String,
    val name: String,
    val description: String?,
    val goalType: String,
    val goalValue: Double,
    val durationDays: Int?,
    val hasReward: Boolean,
    val own: Boolean,
)

data class ChallengesCache(val challenges: List<Challenge>, val fetchedAt: Instant)

/** Un desafío asignado a un alumno, con su avance (progressPct de 0 a 100). */
data class StudentChallenge(
    val id: String,
    val challengeId: String,
    val name: String,
    val goalType: String,
    val goalValue: Double,
    val currentProgress: Double,
    val progressPct: Double,
    val status: String,
    val startedAt: Instant,
    val endsAt: Instant,
    val completedAt: Instant?,
)

/** fetchedAt null = la lista completa del alumno nunca se bajó; items son solo las asignaciones hechas acá. */
data class StudentChallengesCache(val items: List<StudentChallenge>, val fetchedAt: Instant?)

/** Resultado de asignar en lote, con ids de alumnos. */
data class BatchAssignResult(
    val created: List<String>,
    val alreadyActive: List<String>,
    val notYours: List<String>,
)

/** 409 CHALLENGE_ALREADY_ACTIVE: el alumno ya tiene ese desafío activo. */
class ChallengeAlreadyActiveException(message: String) : Exception(message)

/** 404 CHALLENGE_NOT_FOUND: el desafío ya no existe (ya salió del caché). */
class ChallengeGoneException : Exception("El desafío ya no existe")
