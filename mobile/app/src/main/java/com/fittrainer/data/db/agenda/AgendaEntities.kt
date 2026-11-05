package com.fittrainer.data.db.agenda

import androidx.room.Entity
import androidx.room.Index

/** Un turno del entrenador (E13). Fechas en epoch millis; status es el texto del backend tal cual. */
@Entity(
    tableName = "trainer_appointments",
    primaryKeys = ["trainerId", "id"],
    indices = [Index(value = ["trainerId", "scheduledAt"])],
)
data class TrainerAppointmentEntity(
    val trainerId: String,
    val id: String,
    val studentId: String,
    val studentName: String,
    val studentAvatarUrl: String?,
    val scheduledAt: Long,
    val status: String,
    val notes: String?,
    val createdAt: Long,
)

/** Una semana que se bajó alguna vez (sin fila = nunca). weekStart: el lunes, "YYYY-MM-DD". */
@Entity(tableName = "trainer_agenda_weeks", primaryKeys = ["trainerId", "weekStart"])
data class TrainerAgendaWeekEntity(
    val trainerId: String,
    val weekStart: String,
    val fetchedAt: Long,
)

/** Una franja de disponibilidad: weekday 1 = lunes … 7 = domingo, horas en punto de Argentina. */
@Entity(tableName = "trainer_availability", primaryKeys = ["trainerId", "weekday", "startHour"])
data class TrainerAvailabilityEntity(
    val trainerId: String,
    val weekday: Int,
    val startHour: Int,
    val endHour: Int,
)

/** Cuándo se bajó la disponibilidad (sin fila = nunca). */
@Entity(tableName = "trainer_availability_sync", primaryKeys = ["trainerId"])
data class TrainerAvailabilitySyncEntity(
    val trainerId: String,
    val fetchedAt: Long,
)
