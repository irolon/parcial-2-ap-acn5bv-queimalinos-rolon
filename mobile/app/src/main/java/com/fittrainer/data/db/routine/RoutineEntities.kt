package com.fittrainer.data.db.routine

import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.Relation

/** Rutina activa del alumno. */
@Entity(tableName = "routines")
data class RoutineEntity(
    @PrimaryKey val id: String,
    val name: String,
    val goal: String?,
    /** Días tal como vienen del backend, separados por coma ("monday,thursday"). */
    val days: String,
    /** created_at del backend en epoch millis (0 si no se pudo leer: queda como la más vieja). */
    val createdAt: Long,
)

/** Ejercicio de una rutina, con los datos del ejercicio copiados en la fila. */
@Entity(
    tableName = "routine_exercises",
    foreignKeys = [
        ForeignKey(
            entity = RoutineEntity::class,
            parentColumns = ["id"],
            childColumns = ["routineId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("routineId")],
)
data class RoutineExerciseEntity(
    @PrimaryKey val id: String,
    val routineId: String,
    val exerciseId: String,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val videoUrl: String?,
    val sets: Int?,
    val reps: Int?,
    val restSeconds: Int?,
    val suggestedKg: Double?,
    val tempo: String?,
    val notes: String?,
    val orderIndex: Int,
)

/** Última sincronización buena. Una sola fila (id = 0). ownerId = alumno dueño del caché. */
@Entity(tableName = "routine_sync")
data class RoutineSyncEntity(
    @PrimaryKey val id: Int = 0,
    val ownerId: String,
    val lastSyncedAt: Long,
)

data class RoutineWithExercises(
    @Embedded val routine: RoutineEntity,
    @Relation(parentColumn = "id", entityColumn = "routineId")
    val exercises: List<RoutineExerciseEntity>,
)

/** Lo que hay en el caché para su dueño, leído en una sola transacción. */
data class RoutineSnapshot(
    val sync: RoutineSyncEntity,
    val routines: List<RoutineWithExercises>,
)
