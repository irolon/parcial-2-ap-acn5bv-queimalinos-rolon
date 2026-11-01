package com.fittrainer.ui.workout.components.exit

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import kotlinx.coroutines.launch

/**
 * ✕ de la sesión: hoja inferior con las dos acciones principales del mismo ancho (terminar, seguir) y
 * descartar como texto abajo, lejos del pulgar, para no tocarlo por error. Cada acción primero cierra la
 * hoja con su animación (como al deslizarla) y una sola vez, aunque se toque dos veces mientras baja.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExitSheet(progress: String, onDismiss: () -> Unit, onFinish: () -> Unit, onDiscard: () -> Unit) {
    val sheetState = rememberModalBottomSheetState()
    val scope = rememberCoroutineScope()
    var closing by remember { mutableStateOf(false) }
    val closeThen: (() -> Unit) -> Unit = { action ->
        if (!closing) {
            closing = true
            scope.launch { sheetState.hide() }.invokeOnCompletion { action() }
        }
    }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = FtColors.Surface) {
        Column(
            Modifier.fillMaxWidth().padding(start = Spacing.lg, end = Spacing.lg, bottom = Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            Text("¿Qué hacemos con la sesión?", style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            Text(progress, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
            Spacer(Modifier.height(Spacing.xs))
            SheetAction("Terminar sesión", Icons.Filled.Check, FtColors.Brand, FtColors.TextPrimary) { closeThen(onFinish) }
            SheetAction("Seguir entrenando", Icons.Filled.PlayArrow, FtColors.Elevated, FtColors.TextPrimary) { closeThen(onDismiss) }
            TextButton(
                onClick = { closeThen(onDiscard) },
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
