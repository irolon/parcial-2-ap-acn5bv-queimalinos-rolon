package com.fittrainer.data.workout.history

import java.time.Instant

/** De dónde sale una sesión del historial (spec §4 de la tarjeta 12). */
enum class HistoryOrigin {
    /** Caché del servidor. */
    SERVER,
    /** Del celular, todavía sin subir: la UI muestra "Sin subir". */
    LOCAL_PENDING,
    /** Del celular, ya subida pero el historial todavía no se refrescó. */
    LOCAL_SYNCED,
}

data class HistoryItem(
    val id: String,
    val startedAt: Instant,
    val durationMin: Int?,
    val routineName: String?,
    val sets: Int,
    val volumeKg: Double,
    val rpe: Int?,
    val hasPr: Boolean,
    val hasComment: Boolean,
    val origin: HistoryOrigin,
    /** Comentario del entrenador que el alumno todavía no abrió (solo SERVER). */
    val commentUnread: Boolean = false,
)

data class HistorySet(val setNumber: Int, val reps: Int?, val kg: Double?)

data class HistoryExercise(
    val name: String,
    val originalName: String?,
    val plannedSets: Int?,
    val plannedReps: Int?,
    val plannedKg: Double?,
    val isPr: Boolean,
    val sets: List<HistorySet>,
)

/** detailLoaded = false: solo el resumen (las de "Ver más" hasta abrirlas con red). */
data class HistoryDetail(
    val item: HistoryItem,
    val notes: String?,
    val trainerComment: String?,
    val exercises: List<HistoryExercise>,
    val detailLoaded: Boolean,
)
