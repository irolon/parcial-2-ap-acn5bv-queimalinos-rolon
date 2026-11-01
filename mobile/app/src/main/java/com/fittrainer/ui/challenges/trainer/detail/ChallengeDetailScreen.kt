package com.fittrainer.ui.challenges.trainer.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.challenges.trainer.Challenge
import com.fittrainer.ui.challenges.trainer.ASSIGN_TO_STUDENTS
import com.fittrainer.ui.challenges.trainer.CHALLENGES_TITLE
import com.fittrainer.ui.challenges.trainer.CHALLENGE_GONE
import com.fittrainer.ui.challenges.trainer.CHALLENGE_NOT_LOADED
import com.fittrainer.ui.challenges.trainer.CHALLENGE_OWN
import com.fittrainer.ui.challenges.trainer.CHALLENGE_REWARD
import com.fittrainer.ui.challenges.trainer.NEEDS_NETWORK
import com.fittrainer.ui.challenges.trainer.components.BackTitle
import com.fittrainer.ui.challenges.trainer.components.Tag
import com.fittrainer.ui.challenges.trainer.goalLine
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Detalle de un desafío (E14): qué pide, cuánto dura y "Asignar a alumnos". */
@Composable
fun ChallengeDetailScreen(onBack: () -> Unit, viewModel: ChallengeDetailViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    state.pick?.let { pick ->
        AssignStudentsSheet(
            state.students, state.studentsLoad, pick, state.offline,
            viewModel::onToggle, viewModel::onRetryStudents, viewModel::onSubmit, viewModel::onDismissPick,
        )
    }
    LazyColumn(
        Modifier.fillMaxSize().background(FtColors.Background),
        contentPadding = PaddingValues(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        item { BackTitle(state.challenge?.name ?: CHALLENGES_TITLE, onBack) }
        if (state.offline) item { OfflineIndicator("Sin conexión · $NEEDS_NETWORK") }
        state.notice?.let { item { NoticeBanner(it, viewModel::onDismissNotice) } }
        val challenge = state.challenge
        when {
            !state.loaded -> Unit
            state.gone -> item { InfoCard("No disponible", CHALLENGE_GONE) }
            challenge == null -> item { InfoCard("Sin datos", CHALLENGE_NOT_LOADED) }
            else -> {
                item { ChallengeCard(challenge) }
                item {
                    Button(
                        onClick = viewModel::onAssign,
                        enabled = !state.offline,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
                    ) { Text(ASSIGN_TO_STUDENTS) }
                }
            }
        }
    }
}

@Composable
private fun ChallengeCard(challenge: Challenge) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.medium).padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        if (challenge.own) Tag(CHALLENGE_OWN, FtColors.Brand)
        Text(goalLine(challenge.goalType, challenge.goalValue, challenge.durationDays), style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        challenge.description?.takeIf { it.isNotBlank() }?.let {
            Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        }
        if (challenge.hasReward) Text(CHALLENGE_REWARD, style = MaterialTheme.typography.bodySmall, color = FtColors.Amber)
    }
}
