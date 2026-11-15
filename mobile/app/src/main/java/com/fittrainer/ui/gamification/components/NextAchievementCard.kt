package com.fittrainer.ui.gamification.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.gamification.GamificationReady
import com.fittrainer.ui.gamification.MedalUi
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Tarjeta de logros de Progreso: el próximo logro con su barra y las últimas medallas ganadas. Toda la tarjeta abre Logros. */
@Composable
fun NextAchievementCard(ready: GamificationReady, onOpen: () -> Unit) {
    val next = ready.next
    val unlockedText = unlockedLabel(ready.unlockedCount)
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(FtColors.Card)
            .clickable(role = Role.Button, onClick = onOpen)
            .clearAndSetSemantics {
                role = Role.Button
                contentDescription = nextAchievementDescription(next, unlockedText)
            }
            .padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                if (next != null) "PRÓXIMO LOGRO" else "LOGROS",
                style = MaterialTheme.typography.labelSmall,
                color = FtColors.TextSecondary,
                modifier = Modifier.weight(1f),
            )
            Text("Ver logros ›", style = MaterialTheme.typography.labelLarge, color = FtColors.BrandText)
        }
        next?.let { NextRow(it) }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text(unlockedText, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary, modifier = Modifier.weight(1f))
            ready.recent.forEach { MedalIcon(it.category, unlocked = true, size = 28.dp) }
        }
    }
}

@Composable
private fun NextRow(medal: MedalUi) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
        MedalIcon(medal.category, unlocked = false, size = 40.dp)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                Text(
                    medal.name,
                    style = MaterialTheme.typography.titleSmall,
                    color = FtColors.TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                medal.progressLabel?.let { Text(it, style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary) }
            }
            LinearProgressIndicator(
                progress = { medal.progress.coerceIn(0f, 1f) },
                modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
                color = FtColors.Brand,
                trackColor = FtColors.Elevated,
            )
        }
    }
}

internal fun unlockedLabel(count: Int): String = when (count) {
    0 -> "Todavía no desbloqueaste logros"
    1 -> "Tenés 1 desbloqueado"
    else -> "Tenés $count desbloqueados"
}

internal fun nextAchievementDescription(next: MedalUi?, unlockedText: String): String {
    val nextPart = next?.let { "Próximo logro: ${it.name}${it.progressLabel?.let { p -> ", $p" } ?: ""}. " } ?: ""
    return "${nextPart}$unlockedText. Ver logros"
}
