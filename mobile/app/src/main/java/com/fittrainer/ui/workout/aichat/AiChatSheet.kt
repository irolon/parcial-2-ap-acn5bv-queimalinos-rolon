package com.fittrainer.ui.workout.aichat

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.REPLACE_LOCKED
import com.fittrainer.ui.workout.aichat.components.AiChatBubble
import com.fittrainer.ui.workout.aichat.components.AiChatComposer
import com.fittrainer.ui.workout.aichat.components.ThinkingBubble
import com.fittrainer.ui.workout.aichat.components.rememberDictation

/**
 * Guía Mobile p.15 · Asistente IA, arriba de la sesión activa (tarjeta 14). Cerrarla deja al alumno en la misma serie:
 * el timer y el cursor siguen en WorkoutViewModel. «Reemplazar» de una sugerencia llama a [onReplace] (el reemplazo
 * de siempre) y la pantalla cierra la hoja.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiChatSheet(
    target: AiChatTarget,
    canReplace: Boolean,
    onDismiss: () -> Unit,
    onReplace: (LibraryExercise) -> Unit,
    viewModel: AiChatViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val focus = remember { FocusRequester() }
    val list = rememberLazyListState()
    val dictate = rememberDictation(viewModel::onDictated)
    // Una sugerencia que se resuelve tarde se aplica sobre la sesión y el ejercicio de ese momento, no los del toque.
    val currentTarget by rememberUpdatedState(target)
    val currentOnReplace by rememberUpdatedState(onReplace)
    LaunchedEffect(Unit) { viewModel.onOpen() }
    // La hoja puede irse sin onDismissRequest (rotación, salir de la pantalla): la búsqueda en curso se cancela igual.
    DisposableEffect(viewModel) { onDispose { viewModel.onClose() } }
    LaunchedEffect(state.messages.size, state.sending) {
        val last = state.messages.size + (if (state.sending) 1 else 0) - 1
        if (last >= 0) list.animateScrollToItem(last)
    }
    ModalBottomSheet(
        onDismissRequest = {
            viewModel.onClose()
            onDismiss()
        },
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = FtColors.Background,
    ) {
        Column(
            Modifier.fillMaxWidth().fillMaxHeight(0.9f).imePadding().padding(horizontal = Spacing.lg, vertical = Spacing.sm),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            Text("$AI_TITLE · ${target.exerciseName}", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            state.remainingLabel?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary) }
            LazyColumn(Modifier.weight(1f), state = list, verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                if (state.messages.isEmpty() && !state.sending) {
                    item { Text(AI_EMPTY_HINT, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary) }
                }
                items(state.messages, key = { it.id }) { m ->
                    AiChatBubble(
                        m, actionable = m.canReplaceFor(target), canReplace = canReplace,
                        onReplace = { s -> viewModel.onReplaceSuggestion(m, s.exerciseId, { currentTarget }) { currentOnReplace(it) } },
                        onReplaceLocked = { viewModel.showNotice(REPLACE_LOCKED) },
                    )
                }
                if (state.sending) item { ThinkingBubble() }
            }
            state.banner?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary) }
            AiChatComposer(
                draft = viewModel.draft,
                enabled = state.canAsk,
                canSend = state.canSend(viewModel.draft.text),
                focus = focus,
                onDraft = viewModel::onDraft,
                onQuestionChip = { viewModel.onChip(it, target) },
                onPainChip = {
                    viewModel.onPainChip(target.exerciseName)
                    focus.requestFocus()
                },
                onDictate = dictate,
                onSend = { viewModel.onSend(target) },
            )
        }
    }
}
