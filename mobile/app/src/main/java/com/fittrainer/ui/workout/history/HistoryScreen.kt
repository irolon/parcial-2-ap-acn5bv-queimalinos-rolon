package com.fittrainer.ui.workout.history

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import kotlinx.coroutines.flow.collectLatest
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.components.HistoryCard
import com.fittrainer.ui.workout.history.components.HistoryEmptyState
import com.fittrainer.ui.workout.history.components.HistoryFilterRow
import com.fittrainer.ui.workout.history.components.HistoryHeader
import java.time.ZoneId

/** Progreso: historial de sesiones (tarjeta 12). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(onOpen: (String) -> Unit, viewModel: HistoryViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    LaunchedEffect(viewModel) {
        viewModel.events.collectLatest { event ->
            snackbar.showSnackbar(
                when (event) {
                    HistoryEvent.NeedsConnection -> "Necesitás conexión para ver sesiones anteriores"
                    HistoryEvent.LoadMoreFailed -> "No pudimos cargar más sesiones"
                },
            )
        }
    }
    val zone = remember { ZoneId.systemDefault() }
    Box(Modifier.fillMaxSize().background(FtColors.Background)) {
        PullToRefreshBox(isRefreshing = state.isRefreshing, onRefresh = viewModel::onPullToRefresh, modifier = Modifier.fillMaxSize()) {
            LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(Spacing.lg),
                verticalArrangement = Arrangement.spacedBy(Spacing.md),
            ) {
                item { HistoryHeader(state.weekSummary) }
                item { HistoryFilterRow(state.filter, state.hasPending, state.unreadComments, viewModel::onFilterSelected) }
                if (state.isOffline) item { NoticeBanner("Sin conexión · mostrando lo guardado") }
                if (state.refreshFailed) {
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                            NoticeBanner("No pudimos actualizar el historial", onDismiss = viewModel::dismissRefreshError)
                            TextButton(onClick = viewModel::onPullToRefresh, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                                Text("Reintentar")
                            }
                        }
                    }
                }
                if (!state.isRefreshing) HistoryEmptyState(state) { viewModel.onFilterSelected(HistoryFilter.ALL) }
                items(state.visibleItems, key = { it.id }) { item -> HistoryCard(item, zone) { onOpen(item.id) } }
                if (state.hasMore && state.filter == HistoryFilter.ALL) {
                    item {
                        OutlinedButton(
                            onClick = viewModel::onLoadMore,
                            enabled = !state.loadingMore && !state.detailsLoading,
                            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                        ) { Text("Ver más") }
                    }
                }
            }
        }
        SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter))
    }
}
