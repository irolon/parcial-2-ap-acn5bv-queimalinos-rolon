package com.fittrainer.ui.students.overview.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.students.overview.HOME_BELL
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/**
 * Fecha, saludo y campana con el contador de pendientes de hoy. Hasta E12 (centro de notificaciones),
 * tocarla abre la hoja de pendientes de hoy.
 */
@Composable
fun HomeHeader(date: String?, greeting: String, pending: Int, onBell: () -> Unit, extra: @Composable () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            date?.let { Text(it, style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary) }
            Text(greeting, style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
            extra()
        }
        Box {
            IconButton(onClick = onBell, modifier = Modifier.size(Spacing.minTouchTarget).background(FtColors.Card, MaterialTheme.shapes.medium)) {
                Icon(Icons.Filled.Notifications, contentDescription = "$HOME_BELL: $pending", tint = FtColors.TextPrimary)
            }
            if (pending > 0) {
                Text(
                    "$pending",
                    Modifier.align(Alignment.TopEnd).background(FtColors.Coral, CircleShape).padding(horizontal = 6.dp, vertical = 1.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White,
                )
            }
        }
    }
}
