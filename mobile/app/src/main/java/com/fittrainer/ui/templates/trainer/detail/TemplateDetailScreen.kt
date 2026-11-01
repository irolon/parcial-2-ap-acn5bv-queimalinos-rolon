package com.fittrainer.ui.templates.trainer.detail

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import com.fittrainer.data.templates.trainer.TemplateExercise
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.components.exercise.muscleLabel
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.routines.trainer.prescription
import com.fittrainer.ui.students.detail.components.SectionCard
import com.fittrainer.ui.templates.trainer.ASSIGN_TO_STUDENT
import com.fittrainer.ui.templates.trainer.TEMPLATE_GONE
import com.fittrainer.ui.templates.trainer.TEMPLATE_NOT_LOADED
import com.fittrainer.ui.templates.trainer.assign.AssignTemplateSheet
import com.fittrainer.ui.templates.trainer.assign.StudentPickerSheet
import com.fittrainer.ui.templates.trainer.assignTo
import com.fittrainer.ui.templates.trainer.templateDaysLine
import com.fittrainer.ui.templates.trainer.templateGoalLine
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Detalle de una plantilla (E9). Al asignarla, [onAssigned] abre el editor de la rutina nueva. */
@Composable
fun TemplateDetailScreen(onBack: () -> Unit, onAssigned: (String) -> Unit, viewModel: TemplateDetailViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    val context = LocalContext.current
    LaunchedEffect(state.gone) {
        if (state.gone) {
            Toast.makeText(context, TEMPLATE_GONE, Toast.LENGTH_LONG).show()
            onBack()
        }
    }
    LaunchedEffect(state.done) {
        val done = state.done ?: return@LaunchedEffect
        done.warning?.let { Toast.makeText(context, it, Toast.LENGTH_LONG).show() }
        viewModel.onDoneHandled()
        onAssigned(done.routineId)
    }
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
                Text(detail?.summary?.name ?: "Plantilla", style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            }
        }
        if (state.offline) item { OfflineIndicator(NEEDS_NETWORK) }
        when {
            !state.loaded -> Unit
            detail == null -> item { InfoCard("Sin datos", TEMPLATE_NOT_LOADED) }
            else -> {
                item {
                    SectionCard("PLANTILLA") {
                        Text(templateGoalLine(detail.summary), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
                        Text(templateDaysLine(detail.summary), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
                    }
                }
                itemsIndexed(detail.exercises, key = { i, e -> "$i-${e.exerciseId}" }) { _, e -> ExerciseLine(e) }
                item {
                    Button(
                        onClick = viewModel::onAssign,
                        enabled = !state.offline,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
                    ) { Text(state.fixedStudent?.let { assignTo(it.name) } ?: ASSIGN_TO_STUDENT) }
                }
            }
        }
    }
    state.assign?.let { assign ->
        if (assign.pickingStudent) {
            StudentPickerSheet(state.students, viewModel::onSelectStudent, viewModel::onDismissAssign)
        } else {
            AssignTemplateSheet(
                assign, state.offline, viewModel::onPickStudent, viewModel::onNameChange, viewModel::onToggleDay,
                viewModel::onToggleDeactivate, viewModel::onSubmit, viewModel::onRetryPrevious, viewModel::onDismissAssign,
            )
        }
    }
}

@Composable
private fun ExerciseLine(e: TemplateExercise) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.medium).padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(e.name, style = MaterialTheme.typography.titleMedium, color = if (e.available) FtColors.TextPrimary else FtColors.Coral)
        val line = listOf(prescription(e.sets, e.reps, e.restSeconds, e.suggestedKg), muscleLabel(e.muscleGroup)).filter { it.isNotEmpty() }
        Text(line.joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
    }
}
