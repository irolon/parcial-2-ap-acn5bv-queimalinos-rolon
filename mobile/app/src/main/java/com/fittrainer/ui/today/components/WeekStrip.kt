package com.fittrainer.ui.today.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.dayInitial
import com.fittrainer.ui.today.dayName
import java.time.DayOfWeek

/** L a D: días con entrenamiento marcados y hoy resaltado. No marca días hechos (llega con sesiones). */
@Composable
fun WeekStrip(trainingDays: Set<DayOfWeek>, today: DayOfWeek) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.medium).padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text("SEMANA", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            DayOfWeek.values().forEach { day ->
                DayChip(day, training = day in trainingDays, isToday = day == today)
            }
        }
    }
}

@Composable
private fun DayChip(day: DayOfWeek, training: Boolean, isToday: Boolean) {
    val shape = MaterialTheme.shapes.small
    val background = when {
        training && isToday -> FtColors.Brand
        training -> FtColors.Elevated
        else -> Color.Transparent
    }
    val description = buildString {
        append(dayName(day))
        append(if (training) ", entrenás" else ", descanso")
        if (isToday) append(", hoy")
    }
    Box(
        Modifier
            .size(32.dp)
            .background(background, shape)
            .then(if (isToday) Modifier.border(1.dp, FtColors.BrandText, shape) else Modifier)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            dayInitial(day),
            style = MaterialTheme.typography.labelMedium,
            color = if (training) FtColors.TextPrimary else FtColors.Ink5,
        )
    }
}
