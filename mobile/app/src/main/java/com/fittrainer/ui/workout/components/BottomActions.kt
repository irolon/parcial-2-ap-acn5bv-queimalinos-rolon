package com.fittrainer.ui.workout.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import com.fittrainer.ui.theme.Spacing

/**
 * Técnica (hoja de la biblioteca), Reemplazar e IA (deshabilitado: es del sprint 5). Reemplazar bloqueado se
 * ve apagado pero se puede tocar: así la pantalla explica por qué (onReplaceLocked) en vez de un texto fijo.
 */
@Composable
fun BottomActions(canReplace: Boolean, onTechnique: () -> Unit, onReplace: () -> Unit, onReplaceLocked: () -> Unit = {}) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        OutlinedButton(onClick = onTechnique, modifier = Modifier.weight(1f).heightIn(min = Spacing.minTouchTarget)) { Text("Técnica") }
        OutlinedButton(
            onClick = if (canReplace) onReplace else onReplaceLocked,
            colors = if (canReplace) ButtonDefaults.outlinedButtonColors() else ButtonDefaults.outlinedButtonColors(contentColor = FtColors.Ink5),
            border = if (canReplace) ButtonDefaults.outlinedButtonBorder(true) else BorderStroke(1.dp, FtColors.Card),
            modifier = Modifier.weight(1.3f).heightIn(min = Spacing.minTouchTarget).then(
                // Sin `enabled` TalkBack lo leería como botón activo: se avisa que ahora no está disponible.
                if (canReplace) Modifier else Modifier.semantics { stateDescription = "No disponible" },
            ),
        ) { Text("Reemplazar") }
        OutlinedButton(onClick = {}, enabled = false, modifier = Modifier.weight(0.7f).heightIn(min = Spacing.minTouchTarget)) { Text("IA") }
    }
}
