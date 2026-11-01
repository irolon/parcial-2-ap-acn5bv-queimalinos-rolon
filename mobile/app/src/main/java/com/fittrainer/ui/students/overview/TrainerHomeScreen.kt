package com.fittrainer.ui.students.overview

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.students.overview.AttentionItem
import com.fittrainer.data.students.overview.TrainerOverview
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.students.overview.components.AttentionRow
import com.fittrainer.ui.students.overview.components.KpiGrid
import com.fittrainer.ui.students.overview.components.RecentRow
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Adónde llevan las filas: la ficha (E3) o el detalle de una sesión para comentar (E4). */
class HomeNavigation(val onStudent: (String) -> Unit, val onSession: (studentId: String, sessionId: String) -> Unit, val onInvite: () -> Unit)

/** Inicio del entrenador (prototipo EM_Inicio). La campana de notificaciones queda para E12. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrainerHomeScreen(nav: HomeNavigation, viewModel: TrainerHomeViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    PullToRefreshBox(state.refreshing, viewModel::onPullToRefresh, Modifier.fillMaxSize().background(FtColors.Background)) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(Spacing.lg), verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    state.today?.let { Text(headerDate(it), style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary) }
                    Text(greeting(state.name), style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
                    if (state.offline) OfflineIndicator(state.syncedLabel?.let { "Sin conexión · $it" } ?: "Sin conexión")
                }
            }
            val o = state.overview
            if (o != null && !state.offline) state.error?.let { item { NoticeBanner(it, viewModel::dismissError) } }
            when {
                !state.loaded -> Unit
                state.showErrorScreen -> item { RetryCard(state.error.orEmpty(), viewModel::onRetry) }
                o == null -> Unit
                state.noStudents -> item { InviteCard(nav.onInvite) }
                else -> overviewItems(o, state, nav)
            }
        }
    }
}

private fun LazyListScope.overviewItems(o: TrainerOverview, state: TrainerHomeUiState, nav: HomeNavigation) {
    item { KpiGrid(o) }
    item { SectionTitle(HOME_ATTENTION) }
    if (o.attention.isEmpty()) item { Text(HOME_ALL_GOOD, color = FtColors.TextSecondary) }
    items(o.attention, key = { "a-${it.studentId}-${(it as? AttentionItem.FeedbackPending)?.sessionId}" }) { a ->
        AttentionRow(a) {
            when (a) {
                is AttentionItem.AtRisk -> nav.onStudent(a.studentId)
                is AttentionItem.FeedbackPending -> nav.onSession(a.studentId, a.sessionId)
            }
        }
    }
    item { SectionTitle(HOME_RECENT) }
    if (o.recent.isEmpty()) item { Text(HOME_NO_ACTIVITY, color = FtColors.TextSecondary) }
    items(o.recent, key = { "r-${it.sessionId}" }) { r -> RecentRow(r, state.now) { nav.onSession(r.studentId, r.sessionId) } }
}

@Composable
private fun SectionTitle(text: String) {
    Text(text, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
}

@Composable
private fun InviteCard(onInvite: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        InfoCard(HOME_INVITE_TITLE, HOME_INVITE_BODY)
        Button(onClick = onInvite, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) { Text(HOME_INVITE_TITLE) }
    }
}

@Composable
private fun RetryCard(message: String, onRetry: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        InfoCard(HOME_ERROR_TITLE, message)
        Button(onClick = onRetry, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) { Text("Reintentar") }
    }
}
