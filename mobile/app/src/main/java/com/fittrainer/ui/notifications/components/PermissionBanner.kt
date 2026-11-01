package com.fittrainer.ui.notifications.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.ui.notifications.NotificationTexts
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Cartel de arriba cuando el permiso de notificaciones está apagado. "Activar" abre los ajustes de la app. */
@Composable
fun PermissionBanner(onActivate: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(FtColors.Elevated, MaterialTheme.shapes.medium)
            .padding(start = Spacing.md, end = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            NotificationTexts.PERMISSION_OFF,
            modifier = Modifier.weight(1f).padding(vertical = Spacing.md),
            style = MaterialTheme.typography.bodySmall,
            color = FtColors.TextPrimary,
        )
        TextButton(onClick = onActivate, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
            Text(NotificationTexts.ACTIVATE)
        }
    }
}
