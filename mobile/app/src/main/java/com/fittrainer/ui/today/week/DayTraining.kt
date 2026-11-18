package com.fittrainer.ui.today.week

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.routine.Routine
import com.fittrainer.ui.components.bodymap.BodyMap
import com.fittrainer.ui.components.bodymap.BodyView
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.MuscleGroupSummary
import com.fittrainer.ui.today.dayName
import com.fittrainer.ui.today.estimatedMinutes
import com.fittrainer.ui.today.totalSets
import com.fittrainer.ui.today.paintedParts
import com.fittrainer.ui.today.todayMuscles
import java.time.LocalDate

private const val HIGHLIGHTED_CHIPS = 2
private const val HIGHLIGHT_ALPHA = 0.18f

/**
 * Un día futuro con rutina: la tarjeta (nombre, cuerpo con los músculos, series por grupo y "Ver rutina completa") y
 * debajo los tres números a todo el ancho, como en el día de descanso. Sin "Empezar".
 */
@Composable
internal fun FutureTrainingCard(date: LocalDate, routine: Routine, onOpenRoutine: (String) -> Unit) {
    val groups = todayMuscles(routine)
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Column(
            Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.large).padding(Spacing.md),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            Text(routine.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            if (groups.isNotEmpty()) Muscles(date, groups)
            OutlinedButton(
                onClick = { onOpenRoutine(routine.id) },
                modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
            ) { Text("Ver rutina completa", color = FtColors.TextPrimary) }
        }
        Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            StatCell("${routine.exercises.size}", "ejercicios", Modifier.weight(1f))
            StatCell("${totalSets(routine.exercises)}", "series", Modifier.weight(1f))
            StatCell("~${estimatedMinutes(routine.exercises)}", "minutos", Modifier.weight(1f))
        }
    }
}

/** El cuerpo centrado y debajo las series por grupo (las dos primeras resaltadas). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Muscles(date: LocalDate, groups: List<MuscleGroupSummary>) {
    val description = "Músculos del ${dayName(date.dayOfWeek)}: " + groups.joinToString(", ") { it.label }
    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        BodyMap(paintedParts(groups), listOf(BodyView.FRONT, BodyView.BACK), description, Modifier.size(220.dp, 200.dp))
    }
    FlowRow(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
        verticalArrangement = Arrangement.spacedBy(Spacing.xs),
    ) {
        groups.forEachIndexed { i, g -> MuscleChip("${g.label} · ${g.sets} series", i < HIGHLIGHTED_CHIPS) }
    }
}

@Composable
private fun MuscleChip(text: String, highlighted: Boolean) {
    val background = if (highlighted) FtColors.Amber.copy(alpha = HIGHLIGHT_ALPHA) else FtColors.Elevated
    Text(
        text,
        style = MaterialTheme.typography.bodySmall,
        color = if (highlighted) FtColors.Amber else FtColors.TextSecondary,
        modifier = Modifier.background(background, MaterialTheme.shapes.small)
            .padding(horizontal = Spacing.sm, vertical = Spacing.xs),
    )
}
