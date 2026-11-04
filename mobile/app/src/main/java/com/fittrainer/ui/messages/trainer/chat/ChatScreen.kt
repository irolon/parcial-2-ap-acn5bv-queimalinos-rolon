package com.fittrainer.ui.messages.trainer.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.messages.trainer.CHAT_EMPTY
import com.fittrainer.ui.messages.trainer.CHAT_GONE
import com.fittrainer.ui.messages.trainer.LOAD_OLDER
import com.fittrainer.ui.messages.trainer.MESSAGES_RETRY
import com.fittrainer.ui.messages.trainer.SEND_OFFLINE
import com.fittrainer.ui.messages.trainer.STUDENT_INACTIVE_HINT
import com.fittrainer.ui.messages.trainer.components.Composer
import com.fittrainer.ui.messages.trainer.components.MessageBubble
import com.fittrainer.ui.messages.trainer.dayLabel
import com.fittrainer.ui.students.components.StudentAvatar
import com.fittrainer.ui.students.initials
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.LocalDate
import java.time.ZoneId

/** Chat 1 a 1 (prototipo EM_Mensajes). Abre al final y baja solo si llega algo y ya estaba abajo. */
@Composable
fun ChatScreen(onBack: () -> Unit, onGone: () -> Unit, viewModel: ChatViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val zone = remember { ZoneId.systemDefault() }
    val list = rememberLazyListState()
    LifecycleStartEffect(viewModel) {
        viewModel.onForeground()
        onStopOrDispose { viewModel.onBackground() }
    }
    LaunchedEffect(state.gone) { if (state.gone) onGone() }
    val rows = remember(state.messages, zone) { chatRows(state.messages, zone) }
    val newestId = state.messages.lastOrNull()?.id
    LaunchedEffect(newestId) {
        val lastVisible = list.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: -1
        val atBottom = lastVisible >= list.layoutInfo.totalItemsCount - 3
        if (newestId != null && (atBottom || state.messages.last().fromTrainer)) list.scrollToItem(rows.lastIndex.coerceAtLeast(0))
    }
    Column(Modifier.fillMaxSize().background(FtColors.Background).imePadding()) {
        Row(Modifier.fillMaxWidth().padding(Spacing.xs), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary) }
            if (state.name.isNotEmpty()) StudentAvatar(initials(state.name), atRisk = false, size = Spacing.xxl)
            Text(state.name, Modifier.padding(start = Spacing.sm), style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        }
        HorizontalDivider(color = FtColors.Elevated)
        state.notice?.let { NoticeBanner(it, viewModel::dismissNotice, Modifier.padding(Spacing.sm)) }
        Box(Modifier.weight(1f).fillMaxWidth()) {
            when {
                !state.loaded -> Unit
                state.gone -> InfoCard(CHAT_GONE, "")
                !state.everSynced && state.loadError != null -> Column(Modifier.padding(Spacing.lg)) {
                    InfoCard(state.loadError.orEmpty(), "")
                    TextButton(onClick = viewModel::onRetry) { Text(MESSAGES_RETRY) }
                }
                state.everSynced && state.messages.isEmpty() -> Box(Modifier.padding(Spacing.lg)) { InfoCard(state.name, CHAT_EMPTY) }
                else -> LazyColumn(
                    Modifier.fillMaxSize(),
                    state = list,
                    contentPadding = PaddingValues(Spacing.md),
                    verticalArrangement = Arrangement.spacedBy(Spacing.md),
                ) {
                    if (state.hasMore) {
                        item(key = "older") {
                            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                                TextButton(onClick = viewModel::onLoadOlder, enabled = !state.loadingOlder) { Text(LOAD_OLDER) }
                            }
                        }
                    }
                    items(rows, key = { it.key }) { row ->
                        when (row) {
                            is ChatRow.Day -> Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                                Text(dayLabel(row.day, LocalDate.now(zone)), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
                            }
                            is ChatRow.Bubble -> MessageBubble(row.message, zone)
                        }
                    }
                }
            }
        }
        if (!state.gone) {
            val hint = when {
                state.inactive -> STUDENT_INACTIVE_HINT
                state.offline -> SEND_OFFLINE
                else -> null
            }
            Composer(viewModel.draft, state.canSend(viewModel.draft), hint, viewModel::onDraft, viewModel::onSend)
        }
    }
}
