package com.fittrainer.data.routine

import java.time.DayOfWeek
import java.time.Instant

/** Rutina activa del alumno, tal como la ve la app (sin nada de Retrofit ni Room). */
data class Routine(
    val id: String,
    val name: String,
    val goal: String?,
    val days: Set<DayOfWeek>,
    val createdAt: Instant,
    val exercises: List<RoutineExercise>,
)

/** Un ejercicio de la rutina. La lista ya viene ordenada por el orden que puso el entrenador. */
data class RoutineExercise(
    val id: String,
    val exerciseId: String,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val videoUrl: String?,
    val sets: Int?,
    val reps: Int?,
    val restSeconds: Int?,
    val suggestedKg: Double?,
    val tempo: String?,
    val notes: String?,
)

/** Caché de un alumno. lastSyncedAt == null: nunca sincronizó (o lo guardado es de otro usuario). */
data class RoutineCache(val routines: List<Routine>, val lastSyncedAt: Instant?)

/** Qué muestra la pantalla "Hoy". */
sealed interface TodayContent {
    data class Training(val routine: Routine) : TodayContent

    /**
     * Tiene rutina pero hoy no le toca. trainingDays: la unión de los días de todas las rutinas activas
     * (los mismos que mira nextDay). nextDay == null si ninguna rutina tiene días cargados.
     */
    data class Rest(val routine: Routine, val trainingDays: Set<DayOfWeek>, val nextDay: DayOfWeek?) : TodayContent

    data object NoRoutine : TodayContent

    data object NeverSynced : TodayContent
}
