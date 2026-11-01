package com.fittrainer.ui.routines.trainer.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.fittrainer.data.routines.trainer.ExerciseField
import com.fittrainer.data.routines.trainer.ExerciseInput
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** La hoja abierta de un ejercicio: qué se escribe, los errores por campo y si se está guardando. */
data class ExerciseSheetState(
    /** routine_exercise_id (editor), exercise_id (agregar) o la posición en la lista del asistente. */
    val key: String,
    val title: String,
    val input: ExerciseInput,
    val errors: Map<ExerciseField, String> = emptyMap(),
    val message: String? = null,
    val saving: Boolean = false,
    val removable: Boolean = false,
)

/** Hoja del ejercicio: series y reps obligatorios; descanso, kg, tempo y notas opcionales. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExerciseFormSheet(
    sheet: ExerciseSheetState,
    primaryLabel: String,
    offline: Boolean,
    onChange: ((ExerciseInput) -> ExerciseInput) -> Unit,
    onSave: () -> Unit,
    onRemove: () -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            Text(sheet.title, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            sheet.message?.let { Text(it, color = FtColors.Coral) }
            val f = sheet.input
            val e = sheet.errors
            // Sin red (también si se corta con la hoja abierta) no se edita ni se guarda.
            val on = !sheet.saving && !offline
            if (offline && sheet.message == null) Text(NEEDS_NETWORK, color = FtColors.Coral)
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                Field("Series", f.sets, e[ExerciseField.SETS], on, KeyboardType.Number, Modifier.weight(1f)) { v -> onChange { it.copy(sets = v) } }
                Field("Reps", f.reps, e[ExerciseField.REPS], on, KeyboardType.Number, Modifier.weight(1f)) { v -> onChange { it.copy(reps = v) } }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                Field("Descanso (s)", f.rest, e[ExerciseField.REST], on, KeyboardType.Number, Modifier.weight(1f)) { v -> onChange { it.copy(rest = v) } }
                Field("Kg sugerido", f.kg, e[ExerciseField.KG], on, KeyboardType.Decimal, Modifier.weight(1f)) { v -> onChange { it.copy(kg = v) } }
            }
            Field("Tempo", f.tempo, e[ExerciseField.TEMPO], on, KeyboardType.Text, Modifier.fillMaxWidth()) { v -> onChange { it.copy(tempo = v) } }
            Field("Notas", f.notes, e[ExerciseField.NOTES], on, KeyboardType.Text, Modifier.fillMaxWidth(), single = false) { v ->
                onChange { it.copy(notes = v) }
            }
            Button(onClick = onSave, enabled = on, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                Text(if (sheet.saving) "Guardando…" else primaryLabel)
            }
            if (sheet.removable) {
                OutlinedButton(onClick = onRemove, enabled = on, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                    Text("Quitar de la rutina", color = if (on) FtColors.Coral else FtColors.TextSecondary)
                }
            }
        }
    }
}

@Composable
private fun Field(
    label: String,
    value: String,
    error: String?,
    enabled: Boolean,
    keyboard: KeyboardType,
    modifier: Modifier,
    single: Boolean = true,
    onChange: (String) -> Unit,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        modifier = modifier,
        enabled = enabled,
        label = { Text(label) },
        isError = error != null,
        supportingText = error?.let { { Text(it) } },
        singleLine = single,
        minLines = if (single) 1 else 2,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard),
    )
}
