package com.fittrainer.ui.routines.trainer.create

import android.widget.Toast
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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.routines.trainer.components.CheckRow
import com.fittrainer.ui.routines.trainer.components.EditorExerciseRow
import com.fittrainer.ui.routines.trainer.components.ExerciseFormSheet
import com.fittrainer.ui.routines.trainer.components.RoutineHeaderFields
import com.fittrainer.ui.routines.trainer.picker.PickerContent
import com.fittrainer.ui.routines.trainer.prescription
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Asistente "Rutina nueva" (E8). Al crear, abre el editor de la rutina nueva en su lugar. */
@Composable
fun NewRoutineScreen(onBack: () -> Unit, onCreated: (String) -> Unit, viewModel: NewRoutineViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    LaunchedEffect(state.done) {
        val done = state.done ?: return@LaunchedEffect
        done.warning?.let { Toast.makeText(context, it, Toast.LENGTH_LONG).show() }
        onCreated(done.routineId)
    }
    if (state.picking) {
        PickerContent(state.picker, viewModel::onQuery, viewModel::onGroup, viewModel::onPick, viewModel::onClosePicker)
    } else {
        BackHandler(enabled = state.step == 2, onBack = viewModel::onBackStep)
        WizardBody(state, viewModel, if (state.step == 2) viewModel::onBackStep else onBack)
    }
    state.exerciseSheet?.let { sheet ->
        ExerciseFormSheet(
            // En el asistente la hoja es local: no necesita red (solo "Crear").
            sheet, if (sheet.removable) "Guardar" else "Agregar", offline = false,
            viewModel::onExerciseChange, viewModel::onSaveExercise, viewModel::onRemoveExercise, viewModel::onDismissSheet,
        )
    }
}

@Composable
private fun WizardBody(state: NewRoutineUiState, viewModel: NewRoutineViewModel, onBack: () -> Unit) {
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
                Text("$NEW_ROUTINE_TITLE · ${state.step}/2", style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            }
        }
        if (state.offline) item { OfflineIndicator(NEEDS_NETWORK) }
        state.notice?.let { item { NoticeBanner(it, viewModel::dismissNotice) } }
        if (state.step == 1) stepOne(state, viewModel) else stepTwo(state, viewModel)
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.stepOne(state: NewRoutineUiState, viewModel: NewRoutineViewModel) {
    item { RoutineHeaderFields(state.header, state.headerErrors, enabled = true, onChange = viewModel::onHeaderChange) }
    if (state.showDeactivate) {
        item {
            CheckRow(DEACTIVATE_CURRENT, state.deactivateCurrent, onChange = viewModel::onToggleDeactivate)
        }
    }
    item {
        Button(onClick = viewModel::onNext, modifier = Modifier.fillMaxWidth().height(56.dp)) { Text("Siguiente") }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.stepTwo(state: NewRoutineUiState, viewModel: NewRoutineViewModel) {
    itemsIndexed(state.items, key = { i, e -> "$i-${e.exerciseId}" }) { index, e ->
        EditorExerciseRow(
            title = e.name,
            subtitle = prescription(e.values.sets, e.values.reps, e.values.restSeconds, e.values.suggestedKg),
            canMoveUp = index > 0,
            canMoveDown = index < state.items.lastIndex,
            enabled = !state.creating,
            onClick = { viewModel.onOpenExercise(index) },
            onMove = { up -> viewModel.onMove(index, up) },
        )
    }
    item {
        OutlinedButton(onClick = viewModel::onAdd, enabled = !state.creating, modifier = Modifier.fillMaxWidth().height(52.dp)) {
            Text("Agregar ejercicio")
        }
    }
    item {
        Button(onClick = viewModel::onCreate, enabled = state.canCreate, modifier = Modifier.fillMaxWidth().height(56.dp)) {
            Text(if (state.creating) "Creando…" else "Crear rutina")
        }
    }
}
