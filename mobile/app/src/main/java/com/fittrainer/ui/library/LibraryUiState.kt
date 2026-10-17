package com.fittrainer.ui.library

import com.fittrainer.data.library.LibraryCache
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.ui.components.exercise.MUSCLE_ORDER

/**
 * loaded == false: todavía no se leyó Room. selectedGroup == null: "Todos".
 * exercises: ya filtrados por el grupo elegido.
 */
data class LibraryUiState(
    val loaded: Boolean = false,
    val everSynced: Boolean = false,
    val groups: List<String> = emptyList(),
    val selectedGroup: String? = null,
    val exercises: List<LibraryExercise> = emptyList(),
    val isOffline: Boolean = false,
    val isRefreshing: Boolean = false,
    val notice: String? = null,
) {
    /** Sincronizó y la biblioteca no tiene nada (con un grupo elegido nunca pasa: solo hay chips de grupos con ejercicios). */
    val isEmpty: Boolean get() = everSynced && groups.isEmpty() && exercises.isEmpty()

    /** Qué decir cuando nunca se bajó la biblioteca: sin red se pide conectarse; con red y sin pedido en curso, reintentar. */
    val firstLoad: FirstLoadCard? get() = when {
        !loaded || everSynced -> null
        isOffline -> FirstLoadCard.Connect
        isRefreshing -> null
        else -> FirstLoadCard.Retry
    }
}

enum class FirstLoadCard { Connect, Retry }

/** Los grupos con al menos un ejercicio: primero los del backend en su orden, después los desconocidos. */
fun availableGroups(exercises: List<LibraryExercise>): List<String> {
    val present = exercises.mapNotNull { it.muscleGroup }.toSet()
    return MUSCLE_ORDER.filter { it in present } + (present - MUSCLE_ORDER.toSet()).sorted()
}

/** cache == null: Room todavía no respondió. */
fun libraryUiState(
    cache: LibraryCache?,
    requestedGroup: String?,
    isOnline: Boolean,
    isRefreshing: Boolean,
    notice: String?,
): LibraryUiState {
    if (cache == null) return LibraryUiState(isOffline = !isOnline, isRefreshing = isRefreshing, notice = notice)
    val groups = availableGroups(cache.exercises)
    val group = requestedGroup?.takeIf { it in groups }
    return LibraryUiState(
        loaded = true,
        everSynced = cache.lastSyncedAt != null,
        groups = groups,
        selectedGroup = group,
        exercises = if (group == null) cache.exercises else cache.exercises.filter { it.muscleGroup == group },
        isOffline = !isOnline,
        isRefreshing = isRefreshing,
        // Sin biblioteca que mostrar, el aviso "mostrando la última" contradice; la tarjeta de reintento ya lo explica.
        notice = notice.takeIf { cache.lastSyncedAt != null },
    )
}
