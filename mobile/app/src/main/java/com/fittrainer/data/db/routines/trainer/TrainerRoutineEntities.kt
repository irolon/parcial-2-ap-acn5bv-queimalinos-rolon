package com.fittrainer.data.db.routines.trainer

import androidx.room.Entity
import androidx.room.Index

/**
 * Rutina de un alumno, vista por su entrenador (E8). days: separados por coma ("monday,thursday").
 * createdAt en epoch millis (null si el backend no lo mandó).
 */
@Entity(
    tableName = "trainer_routines",
    primaryKeys = ["trainerId", "id"],
    indices = [Index(value = ["trainerId", "studentId"])],
)
data class TrainerRoutineEntity(
    val trainerId: String,
    val id: String,
    val studentId: String,
    val name: String,
    val goal: String?,
    val days: String,
    val active: Boolean,
    val createdAt: Long?,
)

/**
 * Ejercicio de una rutina (id = routine_exercise_id), con los datos del ejercicio copiados. Solo existe
 * si el detalle de la rutina se bajó alguna vez. Sin FK: el refresh de la lista no tiene que borrar el
 * detalle de las rutinas que siguen; los huérfanos se borran a mano (TrainerRoutinesDao).
 */
@Entity(
    tableName = "trainer_routine_exercises",
    primaryKeys = ["trainerId", "id"],
    indices = [Index(value = ["trainerId", "routineId"])],
)
data class TrainerRoutineExerciseEntity(
    val trainerId: String,
    val id: String,
    val routineId: String,
    val exerciseId: String,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val sets: Int?,
    val reps: Int?,
    val restSeconds: Int?,
    val suggestedKg: Double?,
    val tempo: String?,
    val notes: String?,
    val orderIndex: Int,
)

/** Cuándo se bajó la lista de rutinas de un alumno (sin fila = nunca). */
@Entity(tableName = "trainer_routines_sync", primaryKeys = ["trainerId", "studentId"])
data class TrainerRoutinesSyncEntity(
    val trainerId: String,
    val studentId: String,
    val fetchedAt: Long,
)
