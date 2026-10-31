package com.fittrainer.ui.workout.components.exit

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/**
 * ✕ de la sesión: hoja inferior con las dos acciones principales del mismo ancho (terminar, seguir) y
 * descartar como texto abajo, lejos del pulgar, para no tocarlo por error.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExitSheet(progress: String, onDismiss: () -> Unit, onFinish: () -> Unit, onDiscard: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = FtColors.Surface) {
        Column(
            Modifier.fillMaxWidth().padding(start = Spacing.lg, end = Spacing.lg, bottom = Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            Text("¿Qué hacemos con la sesión?", style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            Text(progress, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
            Spacer(Modifier.padding(top = Spacing.xs))
            SheetAction("Terminar sesión", Icons.Filled.Check, FtColors.Brand, FtColors.TextPrimary, onFinish)
            SheetAction("Seguir entrenando", Icons.Filled.PlayArrow, FtColors.Elevated, FtColors.TextPrimary, onDismiss)
            TextButton(
                onClick = onDiscard,
                modifier = Modifier.align(Alignment.CenterHorizontally).heightIn(min = Spacing.minTouchTarget),
            ) {
                Icon(Icons.Filled.Delete, contentDescription = null, tint = FtColors.Coral)
                Spacer(Modifier.width(Spacing.sm))
                Text("Descartar sesión", color = FtColors.Coral)
            }
        }
    }
}

@Composable
private fun SheetAction(label: String, icon: ImageVector, container: Color, content: Color, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        colors = ButtonDefaults.buttonColors(containerColor = container, contentColor = content),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null)
            Spacer(Modifier.width(Spacing.md))
            Text(label)
        }
    }
}
