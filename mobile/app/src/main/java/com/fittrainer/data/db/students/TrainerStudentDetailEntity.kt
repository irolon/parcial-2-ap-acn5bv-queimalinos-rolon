package com.fittrainer.data.db.students

import androidx.room.Entity

/**
 * Ficha cacheada de un alumno (GET /students/:id). Una fila por (entrenador, alumno).
 * gymEquipmentJson: la lista como JSON. activeRoutineDays: días separados por coma ("monday,thursday").
 * La última medición va aplanada (metricRecordedAt == null: sin medidas). Fechas en epoch millis.
 */
@Entity(tableName = "trainer_student_details", primaryKeys = ["trainerId", "id"])
data class TrainerStudentDetailEntity(
    val trainerId: String,
    val id: String,
    val name: String,
    val email: String,
    val goal: String?,
    val level: String?,
    val birthDate: String?,
    val active: Boolean,
    val gymEquipmentJson: String,
    val injuries: String?,
    val createdAt: Long,
    val lastSessionAt: Long?,
    val metricWeightKg: Double?,
    val metricHeightCm: Double?,
    val metricBodyFatPct: Double?,
    val metricBmi: Double?,
    val metricRecordedAt: Long?,
    val activeRoutineName: String?,
    val activeRoutineDays: String?,
    val fetchedAt: Long,
)
