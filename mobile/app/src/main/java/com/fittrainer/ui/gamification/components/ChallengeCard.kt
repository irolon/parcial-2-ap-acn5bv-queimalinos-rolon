package com.fittrainer.ui.gamification.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.gamification.ChallengeUi
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Un desafío: nombre, barra, "3 de 12 sesiones" y "Quedan 9 días" (o "Cumplido"/"No se cumplió"). */
@Composable
fun ChallengeCard(challenge: ChallengeUi, finished: Boolean = false) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, RoundedCornerShape(14.dp)).padding(Spacing.lg)
            .semantics(mergeDescendants = true) { },
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(challenge.name, style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary, modifier = Modifier.weight(1f))
            Text(challenge.timeLabel, style = MaterialTheme.typography.labelSmall, color = if (finished) FtColors.TextSecondary else FtColors.Amber)
        }
        LinearProgressIndicator(
            progress = { challenge.progress.coerceIn(0f, 1f) },
            modifier = Modifier.fillMaxWidth(),
            color = if (finished) FtColors.TextSecondary else FtColors.Brand,
            trackColor = FtColors.Elevated,
        )
        Text(challenge.progressLabel, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
    }
}
