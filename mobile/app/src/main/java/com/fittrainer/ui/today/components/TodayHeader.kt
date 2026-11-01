package com.fittrainer.ui.today.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.headerDate
import java.time.LocalDate

/**
 * showsRoutine: hay una rutina o un día de descanso en pantalla (si no, no hay "última rutina" que mostrar).
 * La campana de avisos va a la derecha del saludo, con los sin leer.
 */
@Composable
fun TodayHeader(
    date: LocalDate,
    studentName: String,
    isOffline: Boolean,
    showsRoutine: Boolean,
    unreadNotifications: Int = 0,
    onOpenNotifications: () -> Unit = {},
) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                Text(headerDate(date), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
                val firstName = studentName.trim().substringBefore(' ')
                Text(
                    text = if (firstName.isEmpty()) "Hola" else "Hola, $firstName",
                    style = MaterialTheme.typography.headlineSmall,
                    color = FtColors.TextPrimary,
                )
            }
            NotificationBell(unreadNotifications, onOpenNotifications)
        }
        if (isOffline) OfflineIndicator(if (showsRoutine) "Sin conexión — mostrando tu última rutina" else "Sin conexión")
    }
}
