package com.fittrainer.ui.workout.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.input.KeyboardType
import com.fittrainer.data.workout.Load
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.kgNumber

/** Lápiz: peso decimal (acepta coma) y reps enteras. "Listo" solo con valores válidos. */
@Composable
fun ManualEntryDialog(initial: Load, onDismiss: () -> Unit, onDone: (Double, Int) -> Unit) {
    var kg by remember { mutableStateOf(kgNumber(initial.kg)) }
    var reps by remember { mutableStateOf(initial.reps.toString()) }
    val kgValue = kg.replace(',', '.').toDoubleOrNull()?.takeIf { it >= 0 }
    val repsValue = reps.toIntOrNull()?.takeIf { it >= 0 }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Peso y reps") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                OutlinedTextField(
                    value = kg, onValueChange = { kg = it }, label = { Text("Peso (kg)") }, singleLine = true,
                    isError = kgValue == null, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
                OutlinedTextField(
                    value = reps, onValueChange = { reps = it }, label = { Text("Reps") }, singleLine = true,
                    isError = repsValue == null, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onDone(kgValue!!, repsValue!!) }, enabled = kgValue != null && repsValue != null) { Text("Listo") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}
