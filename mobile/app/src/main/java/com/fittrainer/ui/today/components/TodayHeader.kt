package com.fittrainer.ui.today.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
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

/** Discreto a propósito: sin señal la app tiene que sentirse confiable, no rota. */
@Composable
private fun OfflineIndicator(text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Box(Modifier.size(6.dp).background(FtColors.Amber, CircleShape))
        Text(
            text,
            style = MaterialTheme.typography.bodySmall,
            color = FtColors.TextSecondary,
        )
    }
}

@Composable
fun NoticeBanner(message: String, onDismiss: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(FtColors.Elevated, MaterialTheme.shapes.medium)
            .padding(start = Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            message,
            modifier = Modifier.weight(1f).padding(vertical = Spacing.md),
            style = MaterialTheme.typography.bodySmall,
            color = FtColors.TextPrimary,
        )
        TextButton(onClick = onDismiss, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
            Text("OK")
        }
    }
}
