package com.fittrainer.ui.challenges.trainer.section

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import com.fittrainer.data.challenges.trainer.Challenge
import com.fittrainer.ui.challenges.trainer.CHALLENGES_NOT_LOADED
import com.fittrainer.ui.challenges.trainer.NEEDS_NETWORK
import com.fittrainer.ui.challenges.trainer.PICK_CHALLENGE
import com.fittrainer.ui.challenges.trainer.components.ChallengeRow
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

private const val HAS_IT = "Ya lo tiene activo"

/** Elegir el desafío para el alumno. Los que ya tiene activos se ven atenuados y no se pueden tocar. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PickChallengeSheet(
    challenges: List<Challenge>,
    activeIds: Set<String>,
    pick: PickChallengeState,
    offline: Boolean,
    onPick: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        LazyColumn(
            Modifier.fillMaxWidth().padding(horizontal = Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.xs),
        ) {
            item { Text(PICK_CHALLENGE, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary) }
            (pick.error ?: NEEDS_NETWORK.takeIf { offline })?.let {
                item { Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.Coral) }
            }
            if (challenges.isEmpty()) item { Text(CHALLENGES_NOT_LOADED, color = FtColors.TextSecondary) }
            items(challenges, key = { it.id }) { challenge ->
                val has = challenge.id in activeIds
                val usable = !has && pick.sending == null && !offline
                Box(Modifier.alpha(if (usable || pick.sending == challenge.id) 1f else 0.45f)) {
                    ChallengeRow(challenge, card = false) { if (usable) onPick(challenge.id) }
                }
                if (has) Text(HAS_IT, Modifier.padding(start = Spacing.xs), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
            }
            item { Text("", Modifier.padding(bottom = Spacing.lg)) }
        }
    }
}
