package com.fittrainer.ui.exercises.trainer.form

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.components.exercise.EQUIPMENT_ORDER
import com.fittrainer.ui.components.exercise.MUSCLE_ORDER
import com.fittrainer.ui.components.exercise.equipmentLabel
import com.fittrainer.ui.components.exercise.muscleLabel
import com.fittrainer.ui.exercises.trainer.EDIT_EXERCISE
import com.fittrainer.ui.exercises.trainer.EXERCISE_GONE
import com.fittrainer.ui.exercises.trainer.NEW_EXERCISE
import com.fittrainer.ui.exercises.trainer.components.ChoiceChips
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Alta o edición de un ejercicio propio (E10). Al guardar vuelve a la biblioteca. */
@Composable
fun ExerciseFormScreen(onBack: () -> Unit, viewModel: ExerciseFormViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    LaunchedEffect(state.done, state.gone) {
        if (state.gone) Toast.makeText(context, EXERCISE_GONE, Toast.LENGTH_LONG).show()
        if (state.done || state.gone) onBack()
    }
    val f = state.input
    val e = state.errors
    val on = !state.saving && !state.offline && state.loaded
    Column(
        Modifier.fillMaxSize().background(FtColors.Background).verticalScroll(rememberScrollState()).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            IconButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
            }
            Text(if (state.editing) EDIT_EXERCISE else NEW_EXERCISE, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
        }
        if (state.offline) OfflineIndicator(NEEDS_NETWORK)
        state.message?.let { Text(it, color = FtColors.Coral) }
        Field("Nombre", f.name, e[ExerciseFormField.NAME], on) { v -> viewModel.onChange { it.copy(name = v) } }
        Label("GRUPO MUSCULAR", e[ExerciseFormField.MUSCLE_GROUP])
        ChoiceChips(MUSCLE_ORDER, f.muscleGroup, ::muscleLabel, on) { v -> viewModel.onChange { it.copy(muscleGroup = v ?: it.muscleGroup) } }
        Label("EQUIPO (OPCIONAL)", e[ExerciseFormField.EQUIPMENT])
        ChoiceChips(EQUIPMENT_ORDER, f.equipment, ::equipmentLabel, on) { v -> viewModel.onChange { it.copy(equipment = v) } }
        Field("Descripción", f.description, e[ExerciseFormField.DESCRIPTION], on, single = false) { v -> viewModel.onChange { it.copy(description = v) } }
        Field("Link del video (opcional)", f.videoUrl, e[ExerciseFormField.VIDEO_URL], on, keyboard = KeyboardType.Uri) { v ->
            viewModel.onChange { it.copy(videoUrl = v) }
        }
        Button(onClick = viewModel::onSave, enabled = on, modifier = Modifier.fillMaxWidth().height(56.dp)) {
            Text(if (state.saving) "Guardando…" else "Guardar")
        }
    }
}

@Composable
private fun Label(text: String, error: String?) {
    Text(text, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
    error?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.Coral) }
}

@Composable
private fun Field(
    label: String,
    value: String,
    error: String?,
    enabled: Boolean,
    single: Boolean = true,
    keyboard: KeyboardType = KeyboardType.Text,
    onChange: (String) -> Unit,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        modifier = Modifier.fillMaxWidth(),
        enabled = enabled,
        label = { Text(label) },
        isError = error != null,
        supportingText = error?.let { { Text(it) } },
        singleLine = single,
        minLines = if (single) 1 else 3,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard),
    )
}
