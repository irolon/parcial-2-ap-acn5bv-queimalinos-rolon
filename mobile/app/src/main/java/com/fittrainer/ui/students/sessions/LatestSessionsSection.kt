package com.fittrainer.ui.students.sessions

import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.ui.students.detail.components.SectionCard
import com.fittrainer.ui.students.sessions.components.RetryRow
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.components.HistoryCard

/** Sección de la ficha (E3): las últimas 3 sesiones y "Ver todas". */
@Composable
fun LatestSessionsSection(
    onOpenAll: () -> Unit,
    onOpenSession: (String) -> Unit,
    viewModel: StudentSessionsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    SectionCard(SESSIONS_SECTION) {
        state.loadError?.let { RetryRow(it, viewModel::onRetry) }
        when {
            !state.loaded -> Unit
            state.items.isEmpty() && state.loadError != null -> Unit
            state.items.isEmpty() -> Text(
                if (state.everSynced) SESSIONS_EMPTY else SESSIONS_NOT_LOADED,
                style = MaterialTheme.typography.bodyMedium,
                color = FtColors.TextSecondary,
            )
            else -> {
                state.items.take(3).forEach { item -> HistoryCard(item, ARGENTINA) { onOpenSession(item.id) } }
                TextButton(onClick = onOpenAll, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text(SESSIONS_SEE_ALL) }
            }
        }
    }
}
