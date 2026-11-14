package com.fittrainer.ui.gamification

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.components.exercise.SectionLabel
import com.fittrainer.ui.gamification.components.ChallengeCard
import com.fittrainer.ui.gamification.components.MedalIcon
import com.fittrainer.ui.gamification.components.MedalRow
import com.fittrainer.ui.gamification.components.StreakCard
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Logros del alumno (tarjeta 15, sin mockup): racha, desafíos y medallas. Hija de Progreso. */
@Composable
fun AchievementsScreen(onBack: () -> Unit, viewModel: GamificationViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    AchievementsBody(state, onBack, viewModel::onPullToRefresh, viewModel::dismissNotice)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AchievementsBody(state: GamificationUiState, onBack: () -> Unit, onRefresh: () -> Unit, onDismissNotice: () -> Unit) {
    var open by remember { mutableStateOf<MedalUi?>(null) }
    var showFinished by rememberSaveable { mutableStateOf(false) }
    PullToRefreshBox(state.isRefreshing, onRefresh, Modifier.fillMaxSize().background(FtColors.Background)) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(Spacing.lg), verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
                    }
                    Text("Logros", style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
                }
            }
            if (state.isOffline) item { OfflineIndicator("Sin conexión · mostrando lo guardado") }
            state.notice?.let { item { NoticeBanner(it, onDismissNotice) } }
            when (val content = state.content) {
                GamificationContent.Loading -> Unit
                GamificationContent.NeverSynced -> item {
                    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                        InfoCard("Todavía no hay datos", "Conectate una vez para ver tus logros.")
                        TextButton(onClick = onRefresh, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Reintentar") }
                    }
                }
                is GamificationContent.Ready -> {
                    val ready = content.ready
                    item { StreakCard(ready.currentStreak, ready.longestStreak) }
                    item { SectionLabel("DESAFÍOS ACTIVOS", ready.activeChallenges.size.toString()) }
                    if (ready.activeChallenges.isEmpty()) {
                        item { InfoCard("Sin desafíos", "Tu entrenador todavía no te asignó desafíos.") }
                    }
                    items(ready.activeChallenges, key = { it.id }) { ChallengeCard(it) }
                    if (ready.finishedChallenges.isNotEmpty()) {
                        item {
                            TextButton(onClick = { showFinished = !showFinished }, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                                Text(if (showFinished) "Ocultar terminados" else "Ver terminados (${ready.finishedChallenges.size})")
                            }
                        }
                        if (showFinished) items(ready.finishedChallenges, key = { "f-${it.id}" }) { ChallengeCard(it, finished = true) }
                    }
                    item { SectionLabel("MEDALLAS", "${ready.medals.count { it.unlocked }}/${ready.medals.size}") }
                    items(ready.medals.chunked(3), key = { row -> row.first().code }) { row -> MedalRow(row) { open = it } }
                }
            }
        }
    }
    open?.let { medal ->
        ModalBottomSheet(onDismissRequest = { open = null }, containerColor = FtColors.Surface) {
            Column(
                Modifier.fillMaxWidth().padding(Spacing.lg).padding(bottom = Spacing.xl),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(Spacing.sm),
            ) {
                MedalIcon(medal.category, medal.unlocked)
                Text(medal.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
                medal.description?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary) }
                Text(medal.dateLabel?.let { "Desbloqueado el $it" } ?: medal.progressLabel.orEmpty(), color = FtColors.TextSecondary)
            }
        }
    }
}
