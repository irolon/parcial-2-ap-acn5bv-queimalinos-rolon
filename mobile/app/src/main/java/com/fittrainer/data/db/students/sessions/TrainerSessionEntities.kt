package com.fittrainer.data.db.students.sessions

import androidx.room.Entity

/**
 * Una sesión de un alumno, vista por su entrenador. listed: se muestra en la lista (vino en la página 1
 * o en un "Ver más" desde el último refresh). exercisesJson: el detalle (la lista de ejercicios del GET
 * de detalle, como JSON); null = todavía no se abrió con red. Fechas en epoch millis.
 */
@Entity(tableName = "trainer_sessions", primaryKeys = ["trainerId", "id"])
data class TrainerSessionEntity(
    val trainerId: String,
    val id: String,
    val studentId: String,
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
    val listed: Boolean,
    val exercisesJson: String?,
)

/** Paginación de la lista de un alumno: cuándo se bajó la página 1, cuál pedir en "Ver más" y si hay más. */
@Entity(tableName = "trainer_sessions_sync", primaryKeys = ["trainerId", "studentId"])
data class TrainerSessionsSyncEntity(
    val trainerId: String,
    val studentId: String,
    val fetchedAt: Long,
    val nextPage: Int,
    val hasMore: Boolean,
)
