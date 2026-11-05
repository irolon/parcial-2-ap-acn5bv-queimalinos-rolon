package com.fittrainer.ui.agenda.student.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.ui.agenda.AGENDA_RETRY
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Volver, el título y una línea opcional abajo. */
@Composable
fun StudentAgendaHeader(title: String, subtitle: String?, onBack: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        IconButton(onClick = onBack, modifier = Modifier.sizeIn(minWidth = Spacing.minTouchTarget, minHeight = Spacing.minTouchTarget)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
        }
        Column {
            Text(title, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            subtitle?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary) }
        }
    }
}

@Composable
fun AgendaLoading() {
    Box(Modifier.fillMaxWidth().padding(Spacing.xl), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = FtColors.Brand)
    }
}

/** Sin nada guardado y falló la bajada: el aviso y Reintentar. */
@Composable
fun AgendaLoadError(title: String, message: String, onRetry: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        InfoCard(title, message)
        Button(onClick = onRetry, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) { Text(AGENDA_RETRY) }
    }
}
