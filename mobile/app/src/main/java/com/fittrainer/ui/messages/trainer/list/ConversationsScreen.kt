package com.fittrainer.ui.messages.trainer.list

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.messages.trainer.MESSAGES_BROADCAST
import com.fittrainer.ui.messages.trainer.MESSAGES_EMPTY
import com.fittrainer.ui.messages.trainer.MESSAGES_ERROR_TITLE
import com.fittrainer.ui.messages.trainer.MESSAGES_RETRY
import com.fittrainer.ui.messages.trainer.MESSAGES_TITLE
import com.fittrainer.ui.messages.trainer.broadcast.BroadcastActions
import com.fittrainer.ui.messages.trainer.broadcast.BroadcastSheet
import com.fittrainer.ui.messages.trainer.components.ConversationRow
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.ZoneId

/** Pestaña Mensajes del entrenador (E11): una conversación por alumno activo, con difusión. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConversationsScreen(onOpen: (String) -> Unit, viewModel: ConversationsViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val zone = remember { ZoneId.systemDefault() }
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    state.broadcast?.let { b ->
        BroadcastSheet(
            state.conversations, b, viewModel.broadcastText, state.offline,
            BroadcastActions(viewModel::onBroadcastText, viewModel::onToggle, viewModel::onToggleAll, viewModel::onSendBroadcast, viewModel::closeBroadcast),
        )
    }
    PullToRefreshBox(
        isRefreshing = state.refreshing,
        onRefresh = viewModel::onPullToRefresh,
        modifier = Modifier.fillMaxSize().background(FtColors.Background),
    ) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(Spacing.lg), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(MESSAGES_TITLE, Modifier.weight(1f), style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
                        OutlinedButton(
                            onClick = viewModel::openBroadcast,
                            enabled = !state.offline && state.conversations.isNotEmpty(),
                            modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
                        ) { Text(MESSAGES_BROADCAST) }
                    }
                    if (state.offline) OfflineIndicator(state.syncedLabel?.let { "Sin conexión · $it" } ?: "Sin conexión")
                }
            }
            state.notice?.let { item { NoticeBanner(it, viewModel::dismissNotice) } }
            if (state.everSynced && !state.offline) state.error?.let { item { NoticeBanner(it, viewModel::dismissError) } }
            when {
                !state.loaded -> Unit
                state.showErrorScreen -> item {
                    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
                        InfoCard(MESSAGES_ERROR_TITLE, state.error.orEmpty())
                        Button(onClick = viewModel::onRetry, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) { Text(MESSAGES_RETRY) }
                    }
                }
                !state.everSynced -> Unit
                state.conversations.isEmpty() -> item { InfoCard(MESSAGES_TITLE, MESSAGES_EMPTY) }
                else -> items(state.conversations, key = { it.studentId }) { c ->
                    ConversationRow(c, state.now, zone) { onOpen(c.studentId) }
                }
            }
        }
    }
}
