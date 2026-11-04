package com.fittrainer.ui.challenges.trainer.list

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.challenges.trainer.CHALLENGES_EMPTY
import com.fittrainer.ui.challenges.trainer.CHALLENGES_NOT_LOADED
import com.fittrainer.ui.challenges.trainer.CHALLENGES_TITLE
import com.fittrainer.ui.challenges.trainer.components.BackTitle
import com.fittrainer.ui.challenges.trainer.components.ChallengeRow
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.students.sessions.components.RetryRow
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Desafíos del entrenador (E14), desde Más: los predefinidos y después los propios. */
@Composable
fun ChallengesScreen(onBack: () -> Unit, onOpen: (String) -> Unit, viewModel: ChallengesViewModel = hiltViewModel()) {
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
        item { BackTitle(CHALLENGES_TITLE, onBack) }
        if (state.offline) item { OfflineIndicator("Sin conexión") }
        state.loadError?.let { item { RetryRow(it, viewModel::onRetry) } }
        when {
            !state.loaded -> Unit
            state.challenges.isEmpty() && state.loadError != null -> Unit
            state.challenges.isEmpty() -> item { InfoCard("Sin desafíos", if (state.everSynced) CHALLENGES_EMPTY else CHALLENGES_NOT_LOADED) }
            else -> items(state.challenges, key = { it.id }) { ChallengeRow(it, card = true) { onOpen(it.id) } }
        }
    }
}
