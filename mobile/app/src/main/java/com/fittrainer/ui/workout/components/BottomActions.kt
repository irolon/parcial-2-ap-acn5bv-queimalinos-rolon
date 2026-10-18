package com.fittrainer.ui.workout.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.Spacing

/** Técnica (hoja de la biblioteca), Reemplazar e IA (deshabilitado: es del sprint 5). */
@Composable
fun BottomActions(canReplace: Boolean, onTechnique: () -> Unit, onReplace: () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        OutlinedButton(onClick = onTechnique, modifier = Modifier.weight(1f).heightIn(min = Spacing.minTouchTarget)) { Text("Técnica") }
        OutlinedButton(
            onClick = onReplace,
            enabled = canReplace,
            modifier = Modifier.weight(1.3f).heightIn(min = Spacing.minTouchTarget),
        ) { Text("Reemplazar") }
        OutlinedButton(onClick = {}, enabled = false, modifier = Modifier.weight(0.7f).heightIn(min = Spacing.minTouchTarget)) { Text("IA") }
    }
}
