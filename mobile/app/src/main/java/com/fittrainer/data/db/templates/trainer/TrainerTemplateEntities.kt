package com.fittrainer.data.db.templates.trainer

import androidx.room.Entity

/**
 * Plantilla del entrenador (E9). days: separados por coma. structureJson: el detalle (los ejercicios de la
 * structure con sus datos) como JSON; null = todavía no se abrió con red. createdAt en epoch millis.
 */
@Entity(tableName = "trainer_templates", primaryKeys = ["trainerId", "id"])
data class TrainerTemplateEntity(
    val trainerId: String,
    val id: String,
    val name: String,
    val goal: String?,
    val level: String?,
    val days: String,
    val exerciseCount: Int,
    val createdAt: Long?,
    val structureJson: String?,
)

/** Cuándo se bajó la lista de plantillas (sin fila = nunca). */
@Entity(tableName = "trainer_templates_sync", primaryKeys = ["trainerId"])
data class TrainerTemplatesSyncEntity(
    val trainerId: String,
    val fetchedAt: Long,
)
