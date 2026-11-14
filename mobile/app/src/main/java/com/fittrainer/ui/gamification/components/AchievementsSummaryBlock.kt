package com.fittrainer.ui.gamification.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.gamification.GamificationContent
import com.fittrainer.ui.gamification.GamificationUiState
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Bloque "Logros recientes" de Progreso (Guía Mobile p.16): racha, récords, semanas completas y las últimas medallas. Sin estado propio. */
@Composable
fun AchievementsSummaryBlock(state: GamificationUiState, onOpen: () -> Unit, onRetry: () -> Unit, onDismissNotice: () -> Unit) {
    val ready = (state.content as? GamificationContent.Ready)?.ready
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        // El refresco de logros falló: aviso con reintento (los logros de abajo pueden estar viejos).
        state.notice?.let { message ->
            Column {
                NoticeBanner(message, onDismissNotice)
                TextButton(onClick = onRetry, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Reintentar") }
            }
        }
        if (ready == null) {
            if (state.content == GamificationContent.NeverSynced) {
                Text("Conectate una vez para ver tus logros", style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
            }
        } else {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                MiniStat("${ready.currentStreak}", "RACHA", FtColors.Coral, Modifier.weight(1f))
                MiniStat("${ready.prSessions}", "RÉCORDS", FtColors.BrandText, Modifier.weight(1f))
                MiniStat("${ready.fullWeeks}", "SEMANAS COMPLETAS", FtColors.Green, Modifier.weight(1f))
            }
        }
        Row(
            Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget).clickable(role = Role.Button, onClick = onOpen),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            ready?.recent?.forEach { MedalIcon(it.category, unlocked = true, size = 32.dp) }
            Text("Ver logros ›", style = MaterialTheme.typography.labelLarge, color = FtColors.BrandText, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun MiniStat(value: String, label: String, color: Color, modifier: Modifier) {
    Column(
        modifier.background(FtColors.Card, RoundedCornerShape(12.dp)).padding(vertical = Spacing.md, horizontal = Spacing.sm)
            .semantics(mergeDescendants = true) { contentDescription = "$label: $value" },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(value, style = MaterialTheme.typography.titleLarge, color = color)
        Text(label, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary, maxLines = 2, textAlign = TextAlign.Center)
    }
}
