package com.fittrainer.ui.today.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Hay una sesión abierta pero Hoy no muestra su rutina para entrenar: el botón solo vuelve a la sesión (no la crea). */
@Composable
fun ActiveWorkoutCard(routineName: String, onContinue: () -> Unit) {
    val shape = MaterialTheme.shapes.large
    Column(
        Modifier
            .fillMaxWidth()
            .background(FtColors.Card, shape)
            .border(1.dp, FtColors.Border, shape)
            .padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text("Sesión en curso de $routineName", style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
        Text("Tenés una sesión sin terminar.", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        Button(
            onClick = onContinue,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget).padding(top = Spacing.sm),
        ) {
            Icon(Icons.Filled.PlayArrow, contentDescription = null)
            Spacer(Modifier.width(Spacing.sm))
            Text("Continuar sesión")
        }
    }
}
