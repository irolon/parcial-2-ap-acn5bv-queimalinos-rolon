package com.fittrainer.ui.routines.trainer.ai

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.routines.trainer.ai.components.AiFormContent
import com.fittrainer.ui.routines.trainer.ai.components.AiSaveSheet
import com.fittrainer.ui.routines.trainer.ai.components.ProposalContent
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** "Rutina con IA" (E15): formulario → propuesta → "Guardar y asignar". [onDone] recibe el aviso para la ficha. */
@Composable
fun AiRoutineScreen(
    onBack: () -> Unit,
    onDone: (String) -> Unit,
    onManual: () -> Unit,
    onGone: () -> Unit,
    viewModel: AiRoutineViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val discarded by viewModel.discarded.collectAsStateWithLifecycle()
    val back = { if (!viewModel.onBack()) onBack() }
    BackHandler(onBack = back)
    LaunchedEffect(discarded) { if (discarded) onBack() }
    LaunchedEffect(state.gone) { if (state.gone) { viewModel.consumeGone(); onGone() } }
    LaunchedEffect(state.done) { state.done?.let { viewModel.consumeDone(); onDone(it.warning ?: AI_ASSIGNED) } }
    if (state.confirmDiscard) {
        AlertDialog(
            onDismissRequest = viewModel::onCancelDiscard,
            title = { Text(AI_DISCARD_TITLE) },
            text = if (state.savedTemplates) ({ Text(AI_DISCARD_SAVED) }) else null,
            confirmButton = { TextButton(onClick = viewModel::onConfirmDiscard) { Text(AI_DISCARD, color = FtColors.Coral) } },
            dismissButton = { TextButton(onClick = viewModel::onCancelDiscard) { Text(AI_KEEP) } },
        )
    }
    AiSaveSheet(state, viewModel)
    val proposal = state.proposal
    // Si Android mató el proceso a mitad de "Guardar y asignar", el progreso vuelve pero la hoja (en memoria) no.
    val resumeAssign = state.sheet == null && (state.assign.canRetry || state.assign.message != null)
    LazyColumn(
        Modifier.fillMaxSize().background(FtColors.Background),
        contentPadding = PaddingValues(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                IconButton(onClick = back, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
                }
                Text(AI_TITLE, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            }
        }
        state.notice?.let { item { NoticeBanner(it, viewModel::dismissNotice) } }
        if (state.offerManual) item { OutlinedButton(onClick = onManual, modifier = Modifier.fillMaxWidth()) { Text(AI_MANUAL) } }
        if (proposal == null) {
            item { AiFormContent(state, viewModel) }
            item {
                if (state.generating) Text(AI_GENERATING, color = FtColors.TextSecondary)
                Button(
                    onClick = viewModel::onGenerate, enabled = state.canGenerate,
                    modifier = Modifier.fillMaxWidth().height(52.dp), colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
                ) { Text(AI_GENERATE) }
            }
        } else {
            item { ProposalContent(proposal) }
            if (resumeAssign) {
                item {
                    state.assign.message?.let { Text(it, color = FtColors.Coral) }
                    OutlinedButton(
                        onClick = viewModel::onRetryAssign, enabled = state.assign.canRetry && !state.assign.running && !state.offline,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                    ) { Text("Reintentar") }
                }
            }
            item {
                Button(
                    onClick = viewModel::onOpenSave, enabled = !state.offline,
                    modifier = Modifier.fillMaxWidth().height(52.dp), colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
                ) { Text(AI_SAVE_ASSIGN) }
            }
            if (!state.assignStarted) {
                item { OutlinedButton(onClick = viewModel::onGenerateAnother, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(AI_GENERATE_ANOTHER) } }
            }
        }
    }
}
