package com.fittrainer.ui.today.week

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

private val TIPS = listOf(
    "🧘" to "10 minutos de estiramiento suave",
    "💧" to "Tomá al menos 2 litros de agua",
    "😴" to "Dormí 7–8 horas",
)

/** Día de descanso que no es hoy: consejos de recuperación y, si es futuro, el entreno que viene después. */
@Composable
internal fun RestDayCards(after: NextTraining?, onOpenRoutine: (String) -> Unit) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.large).padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text("Día de recuperación 😌", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        Text("El músculo crece mientras descansás.", style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        TIPS.forEach { (emoji, text) ->
            HorizontalDivider(color = FtColors.Elevated)
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm), verticalAlignment = Alignment.CenterVertically) {
                Text(emoji, style = MaterialTheme.typography.titleMedium)
                Text(text, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
            }
        }
    }
    if (after != null) AfterCard(after, onOpenRoutine)
}

@Composable
private fun AfterCard(after: NextTraining, onOpenRoutine: (String) -> Unit) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.large).padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(afterLabel(after.date), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        Text(after.routine.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        Text(exercisesText(after.routine.exercises.size), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        OutlinedButton(
            onClick = { onOpenRoutine(after.routine.id) },
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text("Ver rutina", color = FtColors.TextPrimary) }
    }
}
