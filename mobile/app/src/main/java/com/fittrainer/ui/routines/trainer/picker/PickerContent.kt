package com.fittrainer.ui.routines.trainer.picker

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.data.exercises.trainer.TrainerExercise
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.exercise.ExerciseRow
import com.fittrainer.ui.components.exercise.muscleLabel
import com.fittrainer.ui.library.components.MuscleChips
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

const val PICKER_TITLE = "Elegir ejercicio"
const val PICKER_SEARCH = "Buscar"
const val PICKER_CONNECT = "Conectate para cargar la biblioteca"
const val PICKER_FAILED = "No pudimos cargar la biblioteca. Volvé a abrir el selector para reintentar."
const val PICKER_NO_RESULTS = "Sin resultados"

/** Selector de la biblioteca a pantalla completa (sobre el editor o el asistente). Atrás lo cierra. */
@Composable
fun PickerContent(
    state: PickerState,
    onQuery: (String) -> Unit,
    onGroup: (String?) -> Unit,
    onPick: (TrainerExercise) -> Unit,
    onClose: () -> Unit,
) {
    BackHandler(onBack = onClose)
    LazyColumn(
        Modifier.fillMaxSize().background(FtColors.Background),
        contentPadding = PaddingValues(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                IconButton(onClick = onClose, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
                }
                Text(PICKER_TITLE, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            }
        }
        when {
            !state.loaded -> Unit
            state.catalogEmpty -> item {
                InfoCard("Biblioteca vacía", if (state.refreshFailed) PICKER_FAILED else PICKER_CONNECT)
            }
            else -> {
                item {
                    OutlinedTextField(
                        value = state.query,
                        onValueChange = onQuery,
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text(PICKER_SEARCH) },
                        singleLine = true,
                    )
                }
                item { MuscleChips(state.groups, state.group, onGroup) }
                if (state.visible.isEmpty()) {
                    item { Text(PICKER_NO_RESULTS, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary) }
                }
                items(state.visible, key = { it.id }) { exercise ->
                    ExerciseRow(exercise.name, muscleLabel(exercise.muscleGroup), onClick = { onPick(exercise) })
                }
            }
        }
    }
}
