package com.fittrainer.data.gamification

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate

/** Tipos de criterio que el celular cuenta por su cuenta (spec §3.3); el resto solo lo otorga el servidor. */
const val CRITERIA_SESSIONS = "sessions_count"
const val CRITERIA_STREAK = "streak"
const val CRITERIA_CHALLENGE = "challenge"

/** Lo último que mandó el servidor. fetchedAt: reloj del celular al recibirlo. assignedDays: los días con los que el servidor calculó la racha. */
data class Snapshot(
    val currentStreak: Int,
    val longestStreak: Int,
    val lastSessionDate: LocalDate?,
    val sessionsCount: Int,
    val prSessions: Int,
    val fullWeeks: Int,
    val fetchedAt: Long,
    val assignedDays: Set<DayOfWeek> = emptySet(),
)

/** Sesión terminada del celular: finishedAt dice si la foto ya la tiene; startedAt, qué día cuenta (el backend fecha por el inicio). */
data class FinishedSession(val startedAt: Long, val finishedAt: Long)

/** Un logro del catálogo con el progreso de la foto. */
data class Achievement(
    val code: String,
    val name: String,
    val description: String?,
    val category: String?,
    val criteriaType: String?,
    val current: Int,
    val target: Int,
    val unlockedAt: Instant?,
)

/** Logro para mostrar: progreso con la cuenta local. awaitingSync = llegó al objetivo y el servidor todavía no lo otorgó. */
data class AchievementView(val achievement: Achievement, val current: Int, val awaitingSync: Boolean) {
    val unlocked: Boolean get() = achievement.unlockedAt != null
}

data class Challenge(
    val id: String,
    val name: String,
    val description: String?,
    val goalType: String?,
    val goalValue: Double,
    val currentProgress: Double,
    val progressPct: Double,
    val status: String,
    val startedAt: Instant,
    val endsAt: Instant,
    val completedAt: Instant?,
)

/** La gamificación de la cuenta ya con la cuenta local (racha, progreso de sesiones y racha). */
data class GamificationSummary(
    val currentStreak: Int,
    val longestStreak: Int,
    val prSessions: Int,
    val fullWeeks: Int,
    val achievements: List<AchievementView>,
    val challenges: List<Challenge>,
    val fetchedAt: Instant,
)

/** Logro recién desbloqueado según el servidor (unlocked_achievements del sync). */
data class UnlockedAchievement(val code: String, val name: String, val category: String?)

/** Celebración pendiente de mostrar. */
data class Celebration(val code: String, val name: String, val description: String?, val category: String?)
