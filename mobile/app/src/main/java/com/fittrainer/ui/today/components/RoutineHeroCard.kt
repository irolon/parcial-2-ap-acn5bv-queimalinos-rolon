package com.fittrainer.ui.today.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.routine.Routine
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.heroSummary
import com.fittrainer.ui.today.todayMuscles

/** CTA único: "Empezar", o "Continuar sesión" si hay una abierta. Sin ejercicios no se puede empezar. */
@Composable
fun RoutineHeroCard(routine: Routine, workoutActive: Boolean, onStart: () -> Unit, onOpenMuscles: () -> Unit) {
    val shape = MaterialTheme.shapes.large
    val muscles = remember(routine) { todayMuscles(routine) }
    Column(
        Modifier
            .fillMaxWidth()
            .background(FtColors.Card, shape)
            .border(1.dp, FtColors.Border, shape)
            .padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(routine.name, style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
        Text(heroSummary(routine), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        if (muscles.isNotEmpty()) MusclesRow(muscles, onOpenMuscles)
        Button(
            onClick = onStart,
            enabled = workoutActive || routine.exercises.isNotEmpty(),
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget).padding(top = Spacing.sm),
        ) {
            Icon(Icons.Filled.PlayArrow, contentDescription = null)
            Spacer(Modifier.width(Spacing.sm))
            Text(if (workoutActive) "Continuar sesión" else "Empezar")
        }
    }
}
