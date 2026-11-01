package com.fittrainer.ui.students.overview.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fittrainer.data.students.overview.TrainerOverview
import com.fittrainer.ui.students.overview.deltaLabel
import com.fittrainer.ui.students.overview.expectedLabel
import com.fittrainer.ui.students.overview.newLabel
import com.fittrainer.ui.students.overview.pctLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Grilla 2 × 2: ALUMNOS ACTIVOS, SESIONES HOY, ADHERENCIA y EN RIESGO (este con borde y fondo coral). */
@Composable
fun KpiGrid(o: TrainerOverview) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Kpi("ALUMNOS ACTIVOS", "${o.activeStudents}", newLabel(o.new7d), FtColors.Green, Modifier.weight(1f))
            Kpi("SESIONES HOY", "${o.sessionsDone}", expectedLabel(o.sessionsExpected), FtColors.TextSecondary, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            val deltaColor = when {
                (o.adherenceDelta ?: 0) > 0 -> FtColors.Green
                (o.adherenceDelta ?: 0) < 0 -> FtColors.Coral
                else -> FtColors.TextSecondary
            }
            Kpi("ADHERENCIA", pctLabel(o.adherencePct), deltaLabel(o.adherenceDelta), deltaColor, Modifier.weight(1f))
            Kpi("EN RIESGO", "${o.atRisk}", "", FtColors.Coral, Modifier.weight(1f), alert = o.atRisk > 0)
        }
    }
}

@Composable
private fun Kpi(label: String, value: String, extra: String, extraColor: Color, modifier: Modifier, alert: Boolean = false) {
    val shape = MaterialTheme.shapes.large
    Column(
        modifier
            .background(if (alert) FtColors.Coral.copy(alpha = 0.12f) else FtColors.Card, shape)
            .let { if (alert) it.border(1.dp, FtColors.Coral, shape) else it }
            .padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.xs),
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = if (alert) FtColors.Coral else FtColors.TextSecondary)
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text(value, style = MaterialTheme.typography.headlineSmall, color = if (alert) FtColors.Coral else FtColors.TextPrimary)
            if (extra.isNotEmpty()) Text(extra, style = MaterialTheme.typography.labelMedium, color = extraColor)
        }
    }
}
