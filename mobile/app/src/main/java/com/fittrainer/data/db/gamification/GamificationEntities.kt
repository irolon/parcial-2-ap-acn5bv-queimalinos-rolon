package com.fittrainer.data.db.gamification

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

const val CELEBRATION_PENDING = "PENDING"
const val CELEBRATION_SHOWN = "SHOWN"

/** Última foto del servidor (GET .../achievements/progress). fetchedAt: reloj del celular, el mismo que finishedAt (spec §3.3). */
@Entity(tableName = "gamification_snapshot")
data class GamificationSnapshotEntity(
    @PrimaryKey val ownerId: String,
    val currentStreak: Int,
    val longestStreak: Int,
    /** "YYYY-MM-DD" (día de Buenos Aires) o null si nunca cerró una sesión. */
    val lastSessionDate: String?,
    val sessionsCount: Int,
    val prSessions: Int,
    val fullWeeks: Int,
    val fetchedAt: Long,
    /** Días asignados de la foto, separados por coma en inglés ("monday,wednesday"); vacío = sin rutina. */
    val assignedDays: String,
)

/** Un logro del catálogo con el progreso de la foto. position: orden del servidor. */
@Entity(tableName = "achievement_progress", primaryKeys = ["ownerId", "code"])
data class AchievementProgressEntity(
    val ownerId: String,
    val code: String,
    val achievementId: String,
    val name: String,
    val description: String?,
    val category: String?,
    val criteriaType: String?,
    val current: Int,
    val target: Int,
    val unlockedAt: Long?,
    val position: Int,
)

@Entity(tableName = "student_challenges", indices = [Index("ownerId")])
data class StudentChallengeEntity(
    @PrimaryKey val id: String,
    val ownerId: String,
    val name: String,
    val description: String?,
    val goalType: String?,
    val goalValue: Double,
    val currentProgress: Double,
    val progressPct: Double,
    val status: String,
    val startedAt: Long,
    val endsAt: Long,
    val completedAt: Long?,
)

/** Una fila por logro y cuenta: si ya existe (pendiente o mostrada) nadie la vuelve a crear, así no se celebra dos veces. */
@Entity(tableName = "celebrations", primaryKeys = ["ownerId", "code"])
data class CelebrationEntity(
    val ownerId: String,
    val code: String,
    val name: String,
    val description: String?,
    val category: String?,
    val state: String,
    val createdAt: Long,
)
