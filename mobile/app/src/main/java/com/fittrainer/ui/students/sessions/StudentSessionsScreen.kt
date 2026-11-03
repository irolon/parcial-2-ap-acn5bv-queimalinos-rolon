package com.fittrainer.ui.students.sessions

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.students.sessions.components.RetryRow
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.components.HistoryCard

/** Todas las sesiones de un alumno: la página 1 cacheada y "Ver más" (online). */
@Composable
fun StudentSessionsScreen(onBack: () -> Unit, onOpenSession: (String) -> Unit, viewModel: StudentSessionsViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    LazyColumn(
        Modifier.fillMaxSize().background(FtColors.Background),
        contentPadding = PaddingValues(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                IconButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
                }
                Text(SESSIONS_TITLE, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            }
        }
        if (state.offline) item { OfflineIndicator("Sin conexión · mostrando lo guardado") }
        state.notice?.let { item { NoticeBanner(it, viewModel::dismissNotice) } }
        state.loadError?.let { item { RetryRow(it, viewModel::onRetry) } }
        when {
            !state.loaded -> Unit
            state.items.isEmpty() -> if (state.loadError == null) item { InfoCard(SESSIONS_TITLE, if (state.everSynced) SESSIONS_EMPTY else SESSIONS_NOT_LOADED) }
            else -> {
                items(state.items, key = { it.id }) { item -> HistoryCard(item, ARGENTINA) { onOpenSession(item.id) } }
                if (state.hasMore) item {
                    OutlinedButton(
                        onClick = viewModel::onLoadMore,
                        enabled = !state.loadingMore,
                        modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                    ) { Text(if (state.loadingMore) "Cargando…" else SESSIONS_SEE_MORE) }
                }
            }
        }
    }
}
