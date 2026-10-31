package com.fittrainer.ui.workout.history.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.HistoryFilter
import com.fittrainer.ui.workout.history.HistoryUiState

/**
 * Avisos de lista: sin red y sin haber bajado nunca el historial (aunque haya sesiones del celular abajo),
 * o nada que mostrar con el filtro elegido ("Esta semana" ofrece "Ver todos").
 */
fun LazyListScope.HistoryEmptyState(state: HistoryUiState, onShowAll: () -> Unit) {
    if (!state.everLoaded && state.isOffline) {
        item { InfoCard("Sin historial guardado", "Conectate una vez para ver tu historial") }
        return
    }
    if (state.visibleItems.isNotEmpty() || !(state.everLoaded || state.items.isNotEmpty())) return
    when (state.filter) {
        HistoryFilter.ALL -> item { InfoCard("Todavía no hay entrenamientos", "Cuando termines el primero, aparece acá") }
        HistoryFilter.WEEK -> item { WeekEmpty(onShowAll) }
        HistoryFilter.COMMENTED -> item { InfoCard("Todavía no hay entrenamientos con comentarios", "Entre tus últimos entrenamientos guardados.") }
        HistoryFilter.RECORDS -> item { InfoCard("Todavía no hay récords", "Entre tus últimos entrenamientos guardados.") }
        HistoryFilter.PENDING -> Unit // el chip solo existe si hay algo sin subir: nunca queda vacío
    }
}

@Composable
private fun WeekEmpty(onShowAll: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        InfoCard("Sin entrenamientos esta semana", "Cuando entrenes, aparece acá")
        OutlinedButton(onClick = onShowAll, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Ver todos") }
    }
}
