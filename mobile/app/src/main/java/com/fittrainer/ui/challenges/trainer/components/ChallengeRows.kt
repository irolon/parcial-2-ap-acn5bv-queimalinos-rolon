package com.fittrainer.ui.challenges.trainer.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fittrainer.data.challenges.trainer.Challenge
import com.fittrainer.data.challenges.trainer.STATUS_ACTIVE
import com.fittrainer.data.challenges.trainer.STATUS_COMPLETED
import com.fittrainer.data.challenges.trainer.StudentChallenge
import com.fittrainer.ui.challenges.trainer.CHALLENGE_OWN
import com.fittrainer.ui.challenges.trainer.goalLine
import com.fittrainer.ui.challenges.trainer.progressFraction
import com.fittrainer.ui.challenges.trainer.progressLabel
import com.fittrainer.ui.challenges.trainer.statusLabel
import com.fittrainer.ui.challenges.trainer.timeLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.Instant
import java.time.ZoneId

/** Etiqueta chica de color (PROPIO, Activo, Cumplido…). */
@Composable
fun Tag(text: String, color: Color) {
    Text(
        text,
        modifier = Modifier.background(color.copy(alpha = 0.16f), MaterialTheme.shapes.small).padding(horizontal = Spacing.sm, vertical = 2.dp),
        style = MaterialTheme.typography.labelSmall,
        color = color,
    )
}

/** Un desafío de la lista: nombre, meta y PROPIO si lo creó el entrenador. */
@Composable
fun ChallengeRow(challenge: Challenge, card: Boolean, onClick: () -> Unit) {
    val base = Modifier.fillMaxWidth()
    Row(
        (if (card) base.background(FtColors.Card, MaterialTheme.shapes.medium) else base).clickable(onClick = onClick)
            .heightIn(min = Spacing.minTouchTarget).padding(if (card) Spacing.md else Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(challenge.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            Text(goalLine(challenge.goalType, challenge.goalValue, challenge.durationDays), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        }
        if (challenge.own) Tag(CHALLENGE_OWN, FtColors.Brand)
    }
}

/** El avance de un desafío asignado: nombre y estado, barra, "5 de 12 sesiones · Quedan 20 días". */
@Composable
fun StudentChallengeRow(item: StudentChallenge, now: Instant, zone: ZoneId) {
    Column(Modifier.fillMaxWidth().padding(vertical = Spacing.xs), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text(item.name, Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            val color = when (item.status) {
                STATUS_ACTIVE -> FtColors.Brand
                STATUS_COMPLETED -> FtColors.Green
                else -> FtColors.TextSecondary
            }
            Tag(statusLabel(item.status), color)
        }
        LinearProgressIndicator(
            progress = { progressFraction(item.progressPct) },
            modifier = Modifier.fillMaxWidth(),
            color = if (item.status == STATUS_COMPLETED) FtColors.Green else FtColors.Brand,
            trackColor = FtColors.Border,
        )
        Text(
            "${progressLabel(item.goalType, item.currentProgress, item.goalValue)} · ${timeLabel(item, now, zone)}",
            style = MaterialTheme.typography.bodySmall,
            color = FtColors.TextSecondary,
        )
    }
}
