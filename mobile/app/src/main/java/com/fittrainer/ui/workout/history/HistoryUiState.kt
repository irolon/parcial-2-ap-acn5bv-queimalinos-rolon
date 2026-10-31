package com.fittrainer.ui.workout.history

import com.fittrainer.data.workout.history.HistoryItem

/**
 * everLoaded: alguna vez se bajó el historial (si no y no hay red: "Conectate una vez…").
 * items es todo lo guardado; visibleItems, lo que deja pasar el filtro; weekSummary, el resumen de la semana.
 */
data class HistoryUiState(
    val items: List<HistoryItem> = emptyList(),
    val filter: HistoryFilter = HistoryFilter.WEEK,
    val visibleItems: List<HistoryItem> = emptyList(),
    val weekSummary: String = weekSummaryText(emptyList()),
    val hasPending: Boolean = false,
    /** Sesiones con comentario del entrenador sin leer, sobre todo lo guardado (no depende del filtro). */
    val unreadComments: Int = 0,
    val isOffline: Boolean = false,
    val isRefreshing: Boolean = false,
    val refreshFailed: Boolean = false,
    val hasMore: Boolean = false,
    val loadingMore: Boolean = false,
    /** Fase 2 del refresco (detalles) en curso: sin spinner, pero "Ver más" espera. */
    val detailsLoading: Boolean = false,
    val everLoaded: Boolean = false,
)

sealed interface HistoryEvent {
    data object NeedsConnection : HistoryEvent
    data object LoadMoreFailed : HistoryEvent
}
