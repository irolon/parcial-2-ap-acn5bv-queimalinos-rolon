package com.fittrainer.ui.routines.trainer.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Fila de un ejercicio de la rutina: nombre, "4 × 10 · 90 s · 40 kg" y ↑/↓ (44 dp). Tocarla abre su hoja (solo con [enabled]). */
@Composable
fun EditorExerciseRow(
    title: String,
    subtitle: String,
    canMoveUp: Boolean,
    canMoveDown: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
    onMove: (up: Boolean) -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.medium).clickable(enabled = enabled, onClick = onClick)
            .padding(start = Spacing.md, top = Spacing.xs, bottom = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            if (subtitle.isNotEmpty()) Text(subtitle, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        }
        IconButton(onClick = { onMove(true) }, enabled = enabled && canMoveUp, modifier = Modifier.size(Spacing.minTouchTarget)) {
            Icon(Icons.Filled.KeyboardArrowUp, contentDescription = "Subir $title")
        }
        IconButton(onClick = { onMove(false) }, enabled = enabled && canMoveDown, modifier = Modifier.size(Spacing.minTouchTarget)) {
            Icon(Icons.Filled.KeyboardArrowDown, contentDescription = "Bajar $title")
        }
    }
}
