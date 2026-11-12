package com.fittrainer.ui.workout.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.components.OneLineLabel
import com.fittrainer.ui.theme.FtColors
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import com.fittrainer.ui.theme.Spacing

/** Margen de los botones de abajo: el de Material (24 dp por lado) partía "Técnica" en pantallas angostas. */
private val LABEL_PADDING = PaddingValues(horizontal = Spacing.sm)

/**
 * Técnica (hoja de la biblioteca), Reemplazar y ✦ IA (tarjeta 14). Bloqueados se ven apagados pero se pueden tocar:
 * así la pantalla explica por qué (onReplaceLocked / onAiLocked) en vez de un texto fijo.
 */
@Composable
fun BottomActions(
    canReplace: Boolean,
    aiEnabled: Boolean,
    onTechnique: () -> Unit,
    onReplace: () -> Unit,
    onAi: () -> Unit,
    onReplaceLocked: () -> Unit = {},
    onAiLocked: () -> Unit = {},
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        OutlinedButton(
            onClick = onTechnique,
            modifier = Modifier.weight(1f).heightIn(min = Spacing.minTouchTarget),
            contentPadding = LABEL_PADDING,
        ) { OneLineLabel("Técnica") }
        LockableButton("Reemplazar", canReplace, if (canReplace) onReplace else onReplaceLocked, Modifier.weight(1.3f))
        LockableButton("✦ IA", aiEnabled, if (aiEnabled) onAi else onAiLocked, Modifier.weight(0.7f))
    }
}

/** Apagado pero tocable; sin `enabled`, TalkBack lo leería activo: se avisa que ahora no está disponible. */
@Composable
private fun LockableButton(label: String, enabled: Boolean, onClick: () -> Unit, modifier: Modifier) {
    OutlinedButton(
        onClick = onClick,
        colors = if (enabled) ButtonDefaults.outlinedButtonColors() else ButtonDefaults.outlinedButtonColors(contentColor = FtColors.Ink5),
        border = if (enabled) ButtonDefaults.outlinedButtonBorder(true) else BorderStroke(1.dp, FtColors.Card),
        contentPadding = LABEL_PADDING,
        modifier = modifier.heightIn(min = Spacing.minTouchTarget).then(
            if (enabled) Modifier else Modifier.semantics { stateDescription = "No disponible" },
        ),
    ) { OneLineLabel(label) }
}
