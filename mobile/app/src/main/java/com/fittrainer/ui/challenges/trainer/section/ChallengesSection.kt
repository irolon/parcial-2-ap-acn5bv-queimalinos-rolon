package com.fittrainer.ui.challenges.trainer.section

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.ui.challenges.trainer.ASSIGN_CHALLENGE
import com.fittrainer.ui.challenges.trainer.CHALLENGES_SECTION
import com.fittrainer.ui.challenges.trainer.STUDENT_CHALLENGES_EMPTY
import com.fittrainer.ui.challenges.trainer.STUDENT_CHALLENGES_NOT_LOADED
import com.fittrainer.ui.challenges.trainer.components.StudentChallengeRow
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.students.detail.components.SectionCard
import com.fittrainer.ui.students.sessions.components.RetryRow
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/**
 * Sección de la ficha (E14): los desafíos del alumno con su avance, activos primero. [canAssign]: el alumno
 * está activo (a uno dado de baja no se le asignan, pero se sigue viendo lo que hizo).
 */
@Composable
fun ChallengesSection(canAssign: Boolean, viewModel: ChallengesSectionViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    state.pick?.let { pick ->
        PickChallengeSheet(state.catalog, state.activeIds, pick, state.offline, viewModel::onPick, viewModel::onDismissPick)
    }
    SectionCard(CHALLENGES_SECTION) {
        state.notice?.let { NoticeBanner(it, viewModel::onDismissNotice) }
        state.loadError?.let { RetryRow(it, viewModel::onRetry) }
        when {
            !state.loaded -> Unit
            state.items.isEmpty() && state.loadError != null -> Unit
            state.items.isEmpty() -> Text(
                if (state.everSynced) STUDENT_CHALLENGES_EMPTY else STUDENT_CHALLENGES_NOT_LOADED,
                style = MaterialTheme.typography.bodyMedium,
                color = FtColors.TextSecondary,
            )
            else -> state.items.forEach { StudentChallengeRow(it, state.now, ARGENTINA) }
        }
        if (canAssign) {
            OutlinedButton(
                onClick = viewModel::onOpenPick,
                enabled = !state.offline,
                modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
            ) { Text(ASSIGN_CHALLENGE) }
        }
    }
}
