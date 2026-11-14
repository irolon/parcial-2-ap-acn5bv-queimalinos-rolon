package com.fittrainer.ui.gamification.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import com.fittrainer.ui.gamification.MedalUi
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Una fila de hasta 3 medallas; los huecos se rellenan para que las columnas no se corran. */
@Composable
fun MedalRow(medals: List<MedalUi>, onOpen: (MedalUi) -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
        medals.forEach { MedalCell(it, Modifier.weight(1f)) { onOpen(it) } }
        repeat(3 - medals.size) { Spacer(Modifier.weight(1f)) }
    }
}

@Composable
private fun MedalCell(medal: MedalUi, modifier: Modifier, onClick: () -> Unit) {
    val status = if (medal.unlocked) "desbloqueado el ${medal.dateLabel}" else medal.progressLabel.orEmpty()
    Column(
        modifier
            .heightIn(min = Spacing.minTouchTarget)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics(mergeDescendants = true) { contentDescription = "${medal.name}, $status" }
            .padding(vertical = Spacing.sm),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.xs),
    ) {
        MedalIcon(medal.category, medal.unlocked)
        Text(
            medal.name,
            style = MaterialTheme.typography.labelMedium,
            color = if (medal.unlocked) FtColors.TextPrimary else FtColors.TextSecondary,
            textAlign = TextAlign.Center,
            maxLines = 2,
        )
        if (medal.showsBar) {
            LinearProgressIndicator(
                progress = { medal.progress.coerceIn(0f, 1f) },
                modifier = Modifier.fillMaxWidth(),
                color = FtColors.TextSecondary,
                trackColor = FtColors.Elevated,
            )
        }
        (medal.dateLabel ?: medal.progressLabel)?.let {
            Text(it, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary, textAlign = TextAlign.Center)
        }
    }
}
