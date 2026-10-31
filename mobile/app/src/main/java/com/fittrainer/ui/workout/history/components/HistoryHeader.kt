package com.fittrainer.ui.workout.history.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Título de Progreso y el resumen de la semana actual (mismo estilo que TodayHeader). */
@Composable
fun HistoryHeader(weekSummary: String) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Text("Progreso", style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
        Text(weekSummary, style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
    }
}
