package com.fittrainer.ui.routines.trainer.editor

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.routines.trainer.TrainerRoutineDetail
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.join.goalLabel
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.routines.trainer.ROUTINE_GONE
import com.fittrainer.ui.routines.trainer.components.EditorExerciseRow
import com.fittrainer.ui.routines.trainer.components.ExerciseFormSheet
import com.fittrainer.ui.routines.trainer.picker.PickerContent
import com.fittrainer.ui.routines.trainer.prescription
import com.fittrainer.ui.routines.trainer.routineDaysLabel
import com.fittrainer.ui.students.detail.components.SectionCard
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

const val EDITOR_NOT_LOADED = "Conectate para ver la rutina"

/** Editor de la rutina de un alumno (E8): cabecera, "Activa", ejercicios con ↑/↓ y "Agregar ejercicio". */
@Composable
fun RoutineEditorScreen(onBack: () -> Unit, viewModel: RoutineEditorViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    val context = LocalContext.current
    LaunchedEffect(state.gone) {
        if (state.gone) {
            Toast.makeText(context, ROUTINE_GONE, Toast.LENGTH_LONG).show()
            onBack()
        }
    }
    if (state.picking) {
        PickerContent(state.picker, viewModel.picker::onQuery, viewModel.picker::onGroup, viewModel::onPick, viewModel::onClosePicker)
    } else {
        EditorBody(state, viewModel, onBack)
    }
    state.exerciseSheet?.let { sheet ->
        ExerciseFormSheet(
            sheet, if (sheet.removable) "Guardar" else "Agregar", state.offline,
            viewModel::onExerciseChange, viewModel::onSaveExercise, viewModel::onRemoveExercise, viewModel::onDismissSheet,
        )
    }
    val saveTemplate by viewModel.saveAsTemplate.state.collectAsStateWithLifecycle()
    saveTemplate?.let { st ->
        val c = viewModel.saveAsTemplate
        SaveAsTemplateSheet(st, state.offline, c::onName, c::onLevel, c::save, c::dismiss)
    }
    state.headerSheet?.let { RoutineHeaderSheet(it, state.offline, viewModel::onHeaderChange, viewModel::onSaveHeader, viewModel::onDismissSheet) }
}

@Composable
private fun EditorBody(state: RoutineEditorUiState, viewModel: RoutineEditorViewModel, onBack: () -> Unit) {
    val detail = state.detail
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
                Text(detail?.routine?.name ?: "Rutina", style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            }
        }
        if (state.offline) item { OfflineIndicator(NEEDS_NETWORK) }
        state.notice?.let { item { NoticeBanner(it, viewModel::dismissNotice) } }
        when {
            !state.loaded -> Unit
            detail == null -> item { InfoCard("Sin datos", EDITOR_NOT_LOADED) }
            else -> {
                item { HeaderCard(detail, state.canEdit, viewModel::onOpenHeader, viewModel::onToggleActive) }
                itemsIndexed(detail.exercises, key = { _, e -> e.id }) { index, e ->
                    EditorExerciseRow(
                        title = e.name,
                        subtitle = prescription(e.sets, e.reps, e.restSeconds, e.suggestedKg),
                        canMoveUp = index > 0,
                        canMoveDown = index < detail.exercises.lastIndex,
                        enabled = state.canEdit,
                        onClick = { viewModel.onOpenExercise(e.id) },
                        onMove = { up -> viewModel.onMove(e.id, up) },
                    )
                }
                item {
                    OutlinedButton(onClick = viewModel::onAdd, enabled = state.canEdit, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                        Text("Agregar ejercicio")
                    }
                }
                item {
                    TextButton(onClick = viewModel::onOpenSaveAsTemplate, enabled = state.canEdit, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) {
                        Text("Guardar como plantilla")
                    }
                }
            }
        }
    }
}

@Composable
private fun HeaderCard(detail: TrainerRoutineDetail, canEdit: Boolean, onEdit: () -> Unit, onToggle: (Boolean) -> Unit) =
    SectionCard("RUTINA") {
        val r = detail.routine
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(r.goal?.let(::goalLabel).orEmpty(), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
                Text(routineDaysLabel(r.days), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
            }
            TextButton(onClick = onEdit, enabled = canEdit, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Editar") }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Activa", Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
            Switch(checked = r.active, onCheckedChange = onToggle, enabled = canEdit)
        }
    }
