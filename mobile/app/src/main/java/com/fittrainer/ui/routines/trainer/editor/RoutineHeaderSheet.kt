package com.fittrainer.ui.routines.trainer.editor

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.routines.trainer.RoutineHeaderInput
import com.fittrainer.ui.routines.trainer.components.RoutineHeaderFields
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Hoja "Editar": nombre, objetivo y días de la rutina. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoutineHeaderSheet(
    sheet: HeaderSheetState,
    offline: Boolean,
    onChange: ((RoutineHeaderInput) -> RoutineHeaderInput) -> Unit,
    onSave: () -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            Text("Editar rutina", style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            (sheet.message ?: NEEDS_NETWORK.takeIf { offline })?.let { Text(it, color = FtColors.Coral) }
            val on = !sheet.saving && !offline
            RoutineHeaderFields(sheet.input, sheet.errors, enabled = on, onChange = onChange)
            Button(onClick = onSave, enabled = on, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                Text(if (sheet.saving) "Guardando…" else "Guardar")
            }
        }
    }
}
