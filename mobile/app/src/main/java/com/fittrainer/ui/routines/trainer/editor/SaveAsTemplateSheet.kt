package com.fittrainer.ui.routines.trainer.editor

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.templates.trainer.LEVELS
import com.fittrainer.ui.templates.trainer.levelLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Hoja "Guardar como plantilla": nombre y nivel opcional (tocar el nivel elegido lo quita). */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SaveAsTemplateSheet(
    state: SaveTemplateState,
    offline: Boolean,
    onName: (String) -> Unit,
    onLevel: (String?) -> Unit,
    onSave: () -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(Spacing.lg), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text("Guardar como plantilla", style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            (state.message ?: NEEDS_NETWORK.takeIf { offline })?.let { Text(it, color = FtColors.Coral) }
            val on = !state.saving && !offline
            OutlinedTextField(
                value = state.name,
                onValueChange = onName,
                modifier = Modifier.fillMaxWidth(),
                enabled = on,
                label = { Text("Nombre de la plantilla") },
                isError = state.nameError != null,
                supportingText = state.nameError?.let { { Text(it) } },
                singleLine = true,
            )
            Text("NIVEL (OPCIONAL)", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                LEVELS.forEach { level ->
                    val selected = state.level == level
                    FilterChip(
                        selected = selected,
                        onClick = { onLevel(if (selected) null else level) },
                        enabled = on,
                        label = { Text(levelLabel(level).orEmpty()) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = FtColors.Brand, selectedLabelColor = Color.White),
                        modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
                    )
                }
            }
            Button(onClick = onSave, enabled = on, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                Text(if (state.saving) "Guardando…" else "Guardar")
            }
        }
    }
}
