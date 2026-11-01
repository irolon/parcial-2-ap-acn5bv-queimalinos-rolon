package com.fittrainer.ui.routines.detail.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.StartAction
import com.fittrainer.ui.today.startActionHint

/** Barra de abajo del detalle (spec §3.2). Con otra sesión abierta, el botón se apaga y se ofrece ir a esa. */
@Composable
fun StartBar(action: StartAction, onStart: () -> Unit, onOpenWorkout: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Surface).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Button(
            onClick = if (action == StartAction.Continue) onOpenWorkout else onStart,
            enabled = action == StartAction.Start || action == StartAction.Continue,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) {
            Text(if (action == StartAction.Continue) "Continuar sesión" else "Empezar")
        }
        startActionHint(action)?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary) }
        if (action is StartAction.Blocked) {
            TextButton(onClick = onOpenWorkout, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                Text("Ir a la sesión")
            }
        }
    }
}
