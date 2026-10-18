package com.fittrainer.ui.workout.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.data.workout.WorkoutSummary
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.summaryText

/** "Sesión terminada · N series · M min". El RPE y las notas son de la tarjeta 12. */
@Composable
fun WorkoutSummaryView(summary: WorkoutSummary, onBack: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(Spacing.lg),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.xl, Alignment.CenterVertically),
    ) {
        Text("¡Bien ahí!", style = MaterialTheme.typography.displayMedium, color = FtColors.TextPrimary)
        Text(summaryText(summary), style = MaterialTheme.typography.bodyLarge, color = FtColors.TextSecondary)
        Button(onClick = onBack, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) { Text("Volver a Hoy") }
    }
}
