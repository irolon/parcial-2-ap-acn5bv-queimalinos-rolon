package com.fittrainer.ui.workout.feedback

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.rpeLabel

/** "¿Qué tan dura fue?": RPE 1-10 en dos filas, la etiqueta del elegido, nota opcional, Guardar y Saltar. */
@Composable
fun FeedbackForm(state: FeedbackUiState, onRpe: (Int) -> Unit, onNotes: (String) -> Unit, onSave: () -> Unit, onSkip: () -> Unit) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Spacing.md), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("¿Qué tan dura fue?", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        // Un solo grupo de selección única (accesibilidad): TalkBack anuncia cada RPE como opción y cuál está elegida.
        Column(Modifier.fillMaxWidth().selectableGroup(), verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            listOf(1..5, 6..10).forEach { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    row.forEach { n -> RpeButton(n, n == state.rpe, Modifier.weight(1f)) { onRpe(n) } }
                }
            }
        }
        state.rpe?.let { rpe -> rpeLabel(rpe)?.let { Text("$rpe · $it", style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary) } }
        OutlinedTextField(
            value = state.notes, onValueChange = onNotes, label = { Text("Nota (opcional)") },
            modifier = Modifier.fillMaxWidth(), minLines = 2, maxLines = 4,
        )
        Button(onClick = onSave, enabled = state.canSave, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) {
            Text("Guardar")
        }
        TextButton(onClick = onSkip, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Saltar") }
    }
}

/** Botón de RPE con rol de radio (selectable): mismo aspecto que Button / OutlinedButton. */
@Composable
private fun RpeButton(n: Int, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val shape = CircleShape
    val look = if (selected) Modifier.background(FtColors.Brand, shape) else Modifier.border(1.dp, MaterialTheme.colorScheme.outline, shape)
    Box(
        modifier.heightIn(min = Spacing.minTouchTarget).clip(shape).then(look)
            .selectable(selected = selected, role = Role.RadioButton, onClick = onClick)
            .semantics { contentDescription = "RPE $n" },
        contentAlignment = Alignment.Center,
    ) {
        Text("$n", maxLines = 1, style = MaterialTheme.typography.labelLarge, color = if (selected) FtColors.TextPrimary else FtColors.Brand)
    }
}
