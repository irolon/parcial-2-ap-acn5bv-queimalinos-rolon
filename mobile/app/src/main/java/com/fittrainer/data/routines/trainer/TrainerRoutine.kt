package com.fittrainer.data.routines.trainer

import java.time.Instant

/** Rutina de un alumno vista por el entrenador (fila de la sección "Rutinas" de la ficha). */
data class TrainerRoutineSummary(
    val id: String,
    val studentId: String,
    val name: String,
    val goal: String?,
    /** Días del backend (monday … sunday). */
    val days: List<String>,
    val active: Boolean,
    val createdAt: Instant?,
)

data class TrainerRoutineExercise(
    /** Id del ejercicio dentro de la rutina (routine_exercise_id). */
    val id: String,
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

/** Rutina con sus ejercicios en orden. Una rutina siempre tiene al menos uno (lo exige el backend). */
data class TrainerRoutineDetail(
    val routine: TrainerRoutineSummary,
    val exercises: List<TrainerRoutineExercise>,
)

/** Rutinas de un alumno y cuándo se bajó la lista. */
data class StudentRoutinesCache(val routines: List<TrainerRoutineSummary>, val fetchedAt: Instant)

/** Ejercicio elegido de la biblioteca, todavía sin guardar (asistente o "Agregar ejercicio"). */
data class NewRoutineExercise(
    val exerciseId: String,
    val name: String,
    val muscleGroup: String?,
    val values: ExerciseValues,
)
