package com.fittrainer.ui.today.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.headerDate
import java.time.LocalDate

/** showsRoutine: hay una rutina o un día de descanso en pantalla (si no, no hay "última rutina" que mostrar). */
@Composable
fun TodayHeader(date: LocalDate, studentName: String, isOffline: Boolean, showsRoutine: Boolean) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Text(headerDate(date), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        val firstName = studentName.trim().substringBefore(' ')
        Text(
            text = if (firstName.isEmpty()) "Hola" else "Hola, $firstName",
            style = MaterialTheme.typography.headlineSmall,
            color = FtColors.TextPrimary,
        )
        if (isOffline) OfflineIndicator(if (showsRoutine) "Sin conexión — mostrando tu última rutina" else "Sin conexión")
    }
}
