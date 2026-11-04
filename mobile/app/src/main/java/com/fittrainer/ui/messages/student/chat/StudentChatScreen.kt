package com.fittrainer.ui.messages.student.chat

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
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.fittrainer.ui.messages.student.STUDENT_CHAT_EMPTY
import com.fittrainer.ui.messages.student.STUDENT_CHAT_TITLE
import com.fittrainer.ui.messages.student.STUDENT_INACTIVE
import com.fittrainer.ui.messages.student.components.AttachSheet
import com.fittrainer.ui.messages.student.components.PhotoAttachment
import com.fittrainer.ui.messages.student.components.rememberPhotoPicker
import com.fittrainer.ui.messages.trainer.LOAD_OLDER
import com.fittrainer.ui.messages.trainer.MESSAGES_RETRY
import com.fittrainer.ui.messages.trainer.SEND_OFFLINE
import com.fittrainer.ui.messages.trainer.chat.ChatRow
import com.fittrainer.ui.messages.trainer.chat.chatRows
import com.fittrainer.ui.messages.trainer.components.Composer
import com.fittrainer.ui.messages.trainer.components.MessageBubble
import com.fittrainer.ui.messages.trainer.dayLabel
import com.fittrainer.ui.students.components.StudentAvatar
import com.fittrainer.ui.students.initials
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.LocalDate
import java.time.ZoneId

/**
 * La pestaña Mensajes del alumno (tarjeta 18): su chat con el PT, con las mismas burbujas que el del PT (los suyos
 * a la derecha). Abre al final y baja solo si llega algo y ya estaba abajo. Adjuntar: cámara o galería.
 */
@Composable
fun StudentChatScreen(viewModel: StudentChatViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val zone = remember { ZoneId.systemDefault() }
    val list = rememberLazyListState()
    var attaching by rememberSaveable { mutableStateOf(false) }
    val picker = rememberPhotoPicker(onPicked = viewModel::onPhotoPicked, onError = viewModel::onNotice)
    LifecycleStartEffect(viewModel) {
        viewModel.onForeground()
        onStopOrDispose { viewModel.onBackground() }
    }
    val rows = remember(state.messages, zone) { chatRows(state.messages, zone) }
    val newestId = state.messages.lastOrNull()?.id
    LaunchedEffect(newestId) {
        val lastVisible = list.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: -1
        val atBottom = lastVisible >= list.layoutInfo.totalItemsCount - 3
        if (newestId != null && (atBottom || !state.messages.last().fromTrainer)) list.scrollToItem(rows.lastIndex.coerceAtLeast(0))
    }
    Column(Modifier.fillMaxSize().background(FtColors.Background).imePadding()) {
        val name = state.trainerName.ifEmpty { STUDENT_CHAT_TITLE }
        Row(Modifier.fillMaxWidth().padding(Spacing.md), verticalAlignment = Alignment.CenterVertically) {
            if (state.trainerName.isNotEmpty()) StudentAvatar(initials(state.trainerName), atRisk = false, size = Spacing.xxl)
            Text(name, Modifier.padding(start = Spacing.sm), style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        }
        HorizontalDivider(color = FtColors.Elevated)
        state.notice?.let { NoticeBanner(it, viewModel::dismissNotice, Modifier.padding(Spacing.sm)) }
        Box(Modifier.weight(1f).fillMaxWidth()) {
            when {
                !state.loaded -> Unit
                !state.everSynced && state.loadError != null -> Column(Modifier.padding(Spacing.lg)) {
                    InfoCard(state.loadError.orEmpty(), "")
                    TextButton(onClick = viewModel::onRetry) { Text(MESSAGES_RETRY) }
                }
                state.everSynced && state.messages.isEmpty() -> Box(Modifier.padding(Spacing.lg)) { InfoCard(name, STUDENT_CHAT_EMPTY) }
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
                            is ChatRow.Bubble -> MessageBubble(row.message, zone, mine = !row.message.fromTrainer)
                        }
                    }
                }
            }
        }
        val hint = when {
            state.inactive -> STUDENT_INACTIVE
            state.offline -> SEND_OFFLINE
            else -> null
        }
        Composer(
            draft = viewModel.draft,
            canSend = state.canSend(viewModel.draft),
            disabledHint = hint,
            onDraft = viewModel::onDraft,
            onSend = viewModel::onSend,
            onAttach = { attaching = true },
            attachment = state.photo?.let { uri -> { PhotoAttachment(uri, enabled = !state.sending, onRemove = viewModel::onRemovePhoto) } },
        )
    }
    if (attaching) AttachSheet(onDismiss = { attaching = false }, onCamera = picker.takePhoto, onGallery = picker.pickFromGallery)
}
