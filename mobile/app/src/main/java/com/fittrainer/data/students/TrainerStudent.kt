package com.fittrainer.data.students

import java.time.Instant
import java.time.ZoneId

/** Un alumno en la lista del entrenador. adherence == null: el backend no la mandó. */
data class TrainerStudent(
    val id: String,
    val name: String,
    val email: String,
    val goal: String?,
    val active: Boolean,
    val createdAt: Instant,
    val lastSessionAt: Instant?,
    val daysPerWeek: Int,
    val adherence: Adherence?,
)

/** Últimos 7 días completos: días asignados con sesión terminada. pct == null: sin plan. */
data class Adherence(val assigned: Int, val done: Int, val pct: Int?)

/** Lo que hay en Room para el entrenador. lastSyncedAt == null: nunca sincronizó (o el caché era de otro). */
data class StudentsCache(val students: List<TrainerStudent>, val lastSyncedAt: Instant?)

/** Los días de calendario del negocio son los de Argentina (igual que el backend). */
val ARGENTINA: ZoneId = ZoneId.of("America/Argentina/Buenos_Aires")
