package com.fittrainer.data.db.agenda.student

import androidx.room.Entity
import androidx.room.Index

/**
 * Un turno del alumno (tarjeta 16): la forma de trainer_appointments, con el alumno como dueño y sin nombre ni avatar
 * (es él mismo). Fechas en epoch millis; status es el texto del backend tal cual.
 */
@Entity(
    tableName = "student_appointments",
    primaryKeys = ["studentId", "id"],
    indices = [Index(value = ["studentId", "scheduledAt"])],
)
data class StudentAppointmentEntity(
    val studentId: String,
    val id: String,
    val trainerId: String?,
    val scheduledAt: Long,
    val status: String,
    val notes: String?,
    val createdAt: Long,
)

/** Cuándo se bajaron los turnos del alumno (sin fila = nunca). */
@Entity(tableName = "student_appointments_sync", primaryKeys = ["studentId"])
data class StudentAppointmentsSyncEntity(
    val studentId: String,
    val fetchedAt: Long,
)

/** Un horario libre del PT en la última bajada: empieza en startsAt (epoch millis) y dura 60 min. */
@Entity(tableName = "student_free_slots", primaryKeys = ["studentId", "startsAt"])
data class StudentFreeSlotEntity(
    val studentId: String,
    val startsAt: Long,
)

/** Cuándo se bajaron los horarios libres (sin fila = nunca). */
@Entity(tableName = "student_free_slots_sync", primaryKeys = ["studentId"])
data class StudentFreeSlotsSyncEntity(
    val studentId: String,
    val fetchedAt: Long,
)
