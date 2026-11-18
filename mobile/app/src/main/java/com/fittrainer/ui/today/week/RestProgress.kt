package com.fittrainer.ui.today.week

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.LocalDate

@Composable
fun StreakCard(days: Int) {
    Row(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.large).padding(Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Text("🔥", style = MaterialTheme.typography.headlineMedium)
        Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Text(streakTitle(days), style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            Text(
                "El descanso no la corta: está planificado.",
                style = MaterialTheme.typography.bodySmall,
                color = FtColors.TextSecondary,
            )
        }
    }
}

@Composable
fun WeekStatsRow(stats: WeekStats) {
    // Las tres celdas con la misma altura, aunque un texto ocupe más líneas.
    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        StatCell("${stats.doneDays}/${stats.assignedDays}", "esta semana", Modifier.weight(1f))
        StatCell("${stats.monthSessions}", "sesiones del mes", Modifier.weight(1f))
        StatCell("${stats.monthPrs}", "récords del mes", Modifier.weight(1f))
    }
}

@Composable
internal fun StatCell(value: String, caption: String, modifier: Modifier) {
    Column(
        modifier.fillMaxHeight().background(FtColors.Card, MaterialTheme.shapes.large).padding(Spacing.md),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.xs, Alignment.CenterVertically),
    ) {
        Text(value, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary, textAlign = TextAlign.Center)
        Text(caption, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary, textAlign = TextAlign.Center)
    }
}

@Composable
fun NextTrainingCard(next: NextTraining, today: LocalDate, onOpenRoutine: (String) -> Unit) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.large).padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(nextTrainingLabel(next.date, today), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        Text(next.routine.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        val n = next.routine.exercises.size
        Text(
            if (n == 1) "1 ejercicio" else "$n ejercicios",
            style = MaterialTheme.typography.bodyMedium,
            color = FtColors.TextSecondary,
        )
        OutlinedButton(
            onClick = { onOpenRoutine(next.routine.id) },
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text("Ver rutina", color = FtColors.TextPrimary) }
    }
}
