package com.fittrainer.data.workout

import java.time.Instant

/** Valores por defecto cuando la rutina no los trae (spec §3). */
const val DEFAULT_SETS = 3
const val DEFAULT_REPS = 10
const val DEFAULT_REST_SECONDS = 90

/** Sesión de entrenamiento abierta, tal como la ve la app (sin nada de Room). */
data class Workout(
    val id: String,
    val ownerId: String,
    val routineId: String?,
    val routineName: String,
    val startedAt: Instant,
    /** Copia del plan al empezar, ordenada por posición. */
    val exercises: List<WorkoutExercise>,
    val sets: List<WorkoutSet>,
    val cursor: Cursor,
    /** null: no hay descanso en curso. */
    val rest: Rest?,
)

/** Un ejercicio de la copia del plan. sets/reps/restSeconds quedan como vinieron (pueden ser null). */
data class WorkoutExercise(
    val position: Int,
    val routineExerciseId: String?,
    val exerciseId: String,
    /** El ejercicio planificado, si se reemplazó. */
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
) {
    val totalSets: Int get() = (sets ?: DEFAULT_SETS).coerceIn(1, MAX_SET_NUMBER)
    val targetReps: Int get() = reps ?: DEFAULT_REPS
    val restTotal: Int get() = (restSeconds ?: DEFAULT_REST_SECONDS).coerceAtLeast(0)
}

/** Serie confirmada. exerciseId: el realmente ejecutado. */
data class WorkoutSet(
    val id: String,
    val position: Int,
    val exerciseId: String,
    val originalExerciseId: String?,
    val routineExerciseId: String?,
    val setNumber: Int,
    val kg: Double,
    val reps: Int,
    val executedAt: Instant,
)

/** Dónde está el alumno: ejercicio (posición) y número de serie (desde 1). */
data class Cursor(val position: Int, val setNumber: Int)

/** endsAt != null: corriendo. pausedRemainingMs != null: en pausa (endsAt queda null). */
data class Rest(val endsAt: Instant?, val totalSeconds: Int, val pausedRemainingMs: Long?)

/** Topes del backend (session-set.validation.js): fuera de rango la serie se rechazaría para siempre. */
const val MAX_KG = 1000.0
const val MAX_REPS = 1000
const val MAX_SET_NUMBER = 100

data class Load(val kg: Double, val reps: Int) {
    /** La misma carga, dentro de lo que acepta el backend. */
    fun inRange() = Load(kg.coerceIn(0.0, MAX_KG), reps.coerceIn(0, MAX_REPS))
}

data class WorkoutSummary(val sets: Int, val minutes: Long, val sessionId: String)
