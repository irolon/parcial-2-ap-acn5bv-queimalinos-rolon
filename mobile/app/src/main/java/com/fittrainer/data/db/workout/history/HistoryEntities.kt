package com.fittrainer.data.db.workout.history

import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.Relation

/** Resumen de una sesión tal como lo manda GET /students/:id/sessions (tarjeta 12). Es caché: se borra en el logout. */
@Entity(tableName = "history_sessions", indices = [Index(value = ["ownerId", "startedAt"])])
data class HistorySessionEntity(
    @PrimaryKey val id: String,
    val ownerId: String,
    val startedAt: Long,
    val finishedAt: Long?,
    val durationMin: Int?,
    val routineName: String?,
    val rpe: Int?,
    val notes: String?,
    val trainerComment: String?,
    val hasModifications: Boolean,
    val sets: Int,
    val volumeKg: Double,
    val hasPr: Boolean,
    /** Está entre las 20 más recientes del último refresco (las que se guardan con detalle). */
    val inLatest: Boolean,
    /** Sus ejercicios y series ya están guardados. */
    val detailLoaded: Boolean,
)

@Entity(
    tableName = "history_exercises",
    primaryKeys = ["sessionId", "position"],
    foreignKeys = [ForeignKey(HistorySessionEntity::class, ["id"], ["sessionId"], onDelete = ForeignKey.CASCADE)],
)
data class HistoryExerciseEntity(
    val sessionId: String,
    /** Orden del servidor (el del primer executed_at). */
    val position: Int,
    val exerciseName: String,
    val originalExerciseName: String?,
    val plannedSets: Int?,
    val plannedReps: Int?,
    val plannedKg: Double?,
    val isPr: Boolean,
    /** Descanso del plan, en segundos (v9). */
    val plannedRestSeconds: Int? = null,
)

@Entity(
    tableName = "history_sets",
    indices = [Index("sessionId")],
    foreignKeys = [ForeignKey(HistorySessionEntity::class, ["id"], ["sessionId"], onDelete = ForeignKey.CASCADE)],
)
data class HistorySetEntity(
    @PrimaryKey val id: String,
    val sessionId: String,
    val exercisePosition: Int,
    val setNumber: Int,
    val reps: Int?,
    val kg: Double?,
    val executedAt: Long,
    /** Descanso real después de la serie, en segundos (v9). */
    val restSeconds: Int? = null,
)

/**
 * Comentarios del entrenador que el alumno ya abrió (extra de la tarjeta 12). Sin FK: sobrevive al reemplazo del caché.
 * Cuenta como leído solo si el texto es el mismo; si el entrenador lo cambia vuelve a ser nuevo.
 */
@Entity(tableName = "history_comment_seen")
data class HistoryCommentSeenEntity(
    @PrimaryKey val sessionId: String,
    val ownerId: String,
    val comment: String,
)

data class HistoryWithDetails(
    @Embedded val session: HistorySessionEntity,
    @Relation(parentColumn = "id", entityColumn = "sessionId") val exercises: List<HistoryExerciseEntity>,
    @Relation(parentColumn = "id", entityColumn = "sessionId") val sets: List<HistorySetEntity>,
)
