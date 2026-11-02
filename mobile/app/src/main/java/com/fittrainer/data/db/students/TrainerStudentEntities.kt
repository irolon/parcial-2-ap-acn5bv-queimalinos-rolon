package com.fittrainer.data.db.students

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Un alumno de la lista del entrenador (GET /students). Las fechas van en epoch millis.
 * adherenceAssigned == null: el backend no mandó la adherencia.
 */
@Entity(tableName = "trainer_students")
data class TrainerStudentEntity(
    @PrimaryKey val id: String,
    val trainerId: String,
    val name: String,
    val email: String,
    val goal: String?,
    val active: Boolean,
    val avatarUrl: String?,
    val createdAt: Long,
    val lastSessionAt: Long?,
    val daysPerWeek: Int,
    val adherenceAssigned: Int?,
    val adherenceDone: Int?,
    val adherencePct: Int?,
)

/** Última sincronización buena de la lista. Una sola fila (id = 0); trainerId = dueño del caché. */
@Entity(tableName = "trainer_students_sync")
data class TrainerStudentsSyncEntity(
    @PrimaryKey val id: Int = 0,
    val trainerId: String,
    val lastSyncedAt: Long,
)

/** Dueño y alumnos leídos en una sola transacción. */
data class TrainerStudentsSnapshot(
    val sync: TrainerStudentsSyncEntity,
    val students: List<TrainerStudentEntity>,
)
