package com.fittrainer.ui.students.overview.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.components.NotificationBell

/** Fecha, saludo y la campana del centro de notificaciones (E12), con los avisos sin leer, igual que en Hoy. */
@Composable
fun HomeHeader(date: String?, greeting: String, unread: Int, onBell: () -> Unit, extra: @Composable () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            date?.let { Text(it, style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary) }
            Text(greeting, style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
            extra()
        }
        NotificationBell(unread, onBell)
    }
}
