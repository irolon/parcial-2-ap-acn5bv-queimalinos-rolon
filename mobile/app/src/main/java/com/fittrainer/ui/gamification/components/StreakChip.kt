package com.fittrainer.ui.gamification.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.gamification.daysLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Racha en Hoy (Guía Mobile p.12). Sin estado propio: Hoy le pasa los días. Con 0, o sin datos, no se muestra: no hace sentir culpa. */
@Composable
fun StreakChip(days: Int) {
    if (days <= 0) return
    Row(
        Modifier.background(FtColors.Coral.copy(alpha = 0.14f), RoundedCornerShape(50))
            .padding(horizontal = Spacing.md, vertical = Spacing.xs)
            .semantics(mergeDescendants = true) { contentDescription = "Racha de ${daysLabel(days)}" },
        horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(GamificationIcons.Fire, contentDescription = null, tint = FtColors.Coral, modifier = Modifier.size(16.dp))
        Text(daysLabel(days), style = MaterialTheme.typography.labelLarge, color = FtColors.Coral)
    }
}
