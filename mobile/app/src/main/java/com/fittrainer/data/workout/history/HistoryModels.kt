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
    /** Del celular, rechazada por el servidor (FAILED, no se reintenta): la UI muestra "No se pudo subir". */
    LOCAL_FAILED,
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

/**
 * Resultado de "Ver más": la última página guardada (si el servidor tiene más y cuál pedir después) o descartada
 * porque un refresh pasó mientras bajaba.
 */
sealed interface LoadMoreResult {
    data class Page(val hasMore: Boolean, val nextPage: Int) : LoadMoreResult
    data object Stale : LoadMoreResult
}

/** Sesiones de la página 1 sin detalle guardado; gen ata la fase 2 a la misma cuenta/limpieza que la fase 1. */
class PendingDetails internal constructor(val ids: List<String>, internal val gen: Int)
