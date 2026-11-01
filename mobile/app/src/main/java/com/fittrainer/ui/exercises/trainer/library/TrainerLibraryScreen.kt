package com.fittrainer.ui.exercises.trainer.library

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.components.exercise.ExerciseDetailSheet
import com.fittrainer.ui.exercises.trainer.LIBRARY_CONNECT
import com.fittrainer.ui.exercises.trainer.LIBRARY_TITLE
import com.fittrainer.ui.exercises.trainer.NEW_EXERCISE
import com.fittrainer.ui.exercises.trainer.NO_OWN_EXERCISES
import com.fittrainer.ui.exercises.trainer.ONLY_MINE
import com.fittrainer.ui.exercises.trainer.components.LibraryExerciseRow
import com.fittrainer.ui.exercises.trainer.deleteQuestion
import com.fittrainer.ui.exercises.trainer.toDetail
import com.fittrainer.ui.library.components.MuscleChips
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.routines.trainer.picker.PICKER_NO_RESULTS
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Biblioteca del entrenador (E10): buscar, filtrar, ver y dar de alta / editar / borrar los propios. */
@Composable
fun TrainerLibraryScreen(
    onBack: () -> Unit,
    onNew: () -> Unit,
    onEdit: (String) -> Unit,
    viewModel: TrainerLibraryViewModel = hiltViewModel(),
) {
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
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                IconButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
                }
                Text(LIBRARY_TITLE, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            }
        }
        if (state.offline) item { OfflineIndicator(NEEDS_NETWORK) }
        state.notice?.let { item { NoticeBanner(it, viewModel::dismissNotice) } }
        item {
            Button(onClick = onNew, enabled = !state.offline, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(NEW_EXERCISE) }
        }
        val p = state.picker
        when {
            !p.loaded -> Unit
            p.catalogEmpty -> item { InfoCard("Biblioteca vacía", LIBRARY_CONNECT) }
            else -> {
                item {
                    OutlinedTextField(p.query, viewModel.picker::onQuery, Modifier.fillMaxWidth(), label = { Text("Buscar") }, singleLine = true)
                }
                item { MuscleChips(p.groups, p.group, viewModel.picker::onGroup) }
                item {
                    FilterChip(
                        selected = state.onlyOwn, onClick = viewModel::onToggleOnlyOwn, label = { Text(ONLY_MINE) },
                        modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
                    )
                }
                if (state.visible.isEmpty()) {
                    item { Text(if (state.onlyOwn && p.query.isBlank() && p.group == null) NO_OWN_EXERCISES else PICKER_NO_RESULTS, color = FtColors.TextSecondary) }
                }
                items(state.visible, key = { it.id }) { e -> LibraryExerciseRow(e) { viewModel.onSelect(e) } }
            }
        }
    }
    state.selected?.let { e ->
        ExerciseDetailSheet(e.toDetail(), canOpenVideo = !state.offline, onDismiss = viewModel::onDismissDetail) {
            if (!e.isGlobal) {
                OutlinedButton(onClick = { viewModel.onDismissDetail(); onEdit(e.id) }, enabled = !state.offline, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                    Text("Editar")
                }
                OutlinedButton(onClick = viewModel::onAskDelete, enabled = !state.offline, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                    Text("Eliminar", color = if (state.offline) FtColors.TextSecondary else FtColors.Coral)
                }
            }
        }
    }
    state.confirmDelete?.let { e ->
        AlertDialog(
            onDismissRequest = viewModel::onCancelDelete,
            title = { Text("Eliminar ejercicio") },
            text = { Text(deleteQuestion(e.name)) },
            confirmButton = { TextButton(onClick = viewModel::onConfirmDelete, enabled = !state.deleting) { Text("Eliminar", color = FtColors.Coral) } },
            dismissButton = { TextButton(onClick = viewModel::onCancelDelete, enabled = !state.deleting) { Text("Cancelar") } },
        )
    }
}
