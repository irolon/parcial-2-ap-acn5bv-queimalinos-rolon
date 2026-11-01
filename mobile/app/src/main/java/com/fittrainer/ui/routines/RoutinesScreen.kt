package com.fittrainer.ui.routines

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.components.exercise.SectionLabel
import com.fittrainer.ui.routines.components.LibraryEntryCard
import com.fittrainer.ui.routines.components.RoutineCard
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Mis rutinas del alumno (sin mockup: componentes y tema de la Rutina del día). */
@Composable
fun RoutinesScreen(
    onOpenRoutine: (String) -> Unit,
    onOpenLibrary: () -> Unit,
    viewModel: RoutinesViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    // ON_START: al entrar a la pestaña y cada vez que la app vuelve al frente.
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    RoutinesBody(state, onOpenRoutine, onOpenLibrary, viewModel::onPullToRefresh, viewModel::dismissNotice)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoutinesBody(
    state: RoutinesUiState,
    onOpenRoutine: (String) -> Unit,
    onOpenLibrary: () -> Unit,
    onRefresh: () -> Unit,
    onDismissNotice: () -> Unit,
) {
    val content = state.content
    PullToRefreshBox(
        isRefreshing = state.isRefreshing,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize().background(FtColors.Background),
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    Text("Mis rutinas", style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
                    if (state.isOffline) {
                        OfflineIndicator(if (content is RoutinesContent.Routines) "Sin conexión · mostrando lo guardado" else "Sin conexión")
                    }
                }
            }
            state.notice?.let { notice -> item { NoticeBanner(notice, onDismissNotice) } }
            item { LibraryEntryCard(onOpenLibrary) }
            when (content) {
                RoutinesContent.NeverSynced -> {
                    item { InfoCard("Todavía no hay datos", "Conectate una vez para descargar tus rutinas.") }
                    // Spec §3.1: el mismo refresco que el pull-to-refresh, para quien no sabe que se puede tirar.
                    item { TextButton(onClick = onRefresh, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Reintentar") } }
                }
                RoutinesContent.Empty -> item {
                    InfoCard("Sin rutinas por ahora", "Tu entrenador todavía no te asignó rutinas.")
                }
                is RoutinesContent.Routines -> {
                    item { SectionLabel("RUTINAS ASIGNADAS", content.cards.size.toString()) }
                    items(content.cards, key = { it.id }) { card -> RoutineCard(card) { onOpenRoutine(card.id) } }
                }
                null -> Unit
            }
        }
    }
}
