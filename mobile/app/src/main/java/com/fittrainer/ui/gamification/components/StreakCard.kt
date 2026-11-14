package com.fittrainer.ui.gamification.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
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

/** Racha actual (con la cuenta local) y la mejor. */
@Composable
fun StreakCard(current: Int, longest: Int) {
    Row(
        Modifier.fillMaxWidth().background(FtColors.Card, RoundedCornerShape(14.dp)).padding(Spacing.lg)
            .semantics(mergeDescendants = true) { contentDescription = "Racha de ${daysLabel(current)}. Mejor racha: ${daysLabel(longest)}" },
        horizontalArrangement = Arrangement.spacedBy(Spacing.lg),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MedalIcon("streak", unlocked = current > 0)
        Column(Modifier.weight(1f)) {
            Text(daysLabel(current), style = MaterialTheme.typography.headlineSmall, color = FtColors.Coral)
            Text("Racha actual", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(daysLabel(longest), style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            Text("Mejor racha", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        }
    }
}
