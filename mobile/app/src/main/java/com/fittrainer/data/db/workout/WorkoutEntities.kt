package com.fittrainer.data.db.workout

import androidx.room.ColumnInfo
import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.Relation

const val STATUS_ACTIVE = "ACTIVE"
const val STATUS_FINISHED = "FINISHED"
/** La tarjeta 11 la sube y la marca como subida. */
const val SYNC_PENDING = "PENDING"
/** Subida y guardada en el servidor (tarjeta 11). */
const val SYNC_SYNCED = "SYNCED"
/** El servidor la rechazó para siempre (spec §5 de la tarjeta 11): no se reintenta. */
const val SYNC_FAILED = "FAILED"

/**
 * Sesión de entrenamiento. Mismos datos que `sessions` del backend más el cursor (dónde está el
 * alumno) para retomar. No es un caché: no se borra en el logout (spec §4).
 */
@Entity(tableName = "workout_sessions", indices = [Index(value = ["ownerId", "status"])])
data class WorkoutSessionEntity(
    @PrimaryKey val id: String,
    val ownerId: String,
    val routineId: String?,
    val routineName: String,
    val startedAt: Long,
    val finishedAt: Long?,
    val status: String,
    val syncState: String,
    val currentPosition: Int,
    val currentSet: Int,
    val restEndsAt: Long?,
    val restTotalSeconds: Int?,
    val restPausedRemainingMs: Long?,
    /** El alumno ya vio y descartó en Hoy que no se pudo subir (v6): deja de contarse en el aviso. */
    @ColumnInfo(defaultValue = "0") val failureSeen: Boolean = false,
)

/** Copia del plan al empezar: que Hoy refresque la rutina no cambia la sesión. */
@Entity(
    tableName = "workout_exercises",
    primaryKeys = ["sessionId", "position"],
    foreignKeys = [
        ForeignKey(
            entity = WorkoutSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
)
data class WorkoutExerciseEntity(
    val sessionId: String,
    val position: Int,
    val routineExerciseId: String?,
    val exerciseId: String,
    val originalExerciseId: String?,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val description: String?,
    val videoUrl: String?,
    val sets: Int?,
    val reps: Int?,
    val restSeconds: Int?,
    val suggestedKg: Double?,
)

/** Serie confirmada. Mismos datos que `session_sets` del backend; executedAt es el momento real. */
@Entity(
    tableName = "workout_sets",
    foreignKeys = [
        ForeignKey(
            entity = WorkoutSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index(value = ["sessionId", "position", "setNumber"], unique = true), Index("exerciseId")],
)
data class WorkoutSetEntity(
    @PrimaryKey val id: String,
    val sessionId: String,
    val position: Int,
    val exerciseId: String,
    val originalExerciseId: String?,
    val routineExerciseId: String?,
    val setNumber: Int,
    val actualKg: Double,
    val actualReps: Int,
    val executedAt: Long,
    /** PENDING hasta que el servidor la guarda (SYNCED) o la rechaza (FAILED, con su code en syncError). */
    @ColumnInfo(defaultValue = SYNC_PENDING) val syncState: String = SYNC_PENDING,
    val syncError: String? = null,
    /** Como en la sesión: el rechazo ya se vio y se descartó en Hoy (v6). */
    @ColumnInfo(defaultValue = "0") val failureSeen: Boolean = false,
)

data class WorkoutWithDetails(
    @Embedded val session: WorkoutSessionEntity,
    @Relation(parentColumn = "id", entityColumn = "sessionId")
    val exercises: List<WorkoutExerciseEntity>,
    @Relation(parentColumn = "id", entityColumn = "sessionId")
    val sets: List<WorkoutSetEntity>,
)
