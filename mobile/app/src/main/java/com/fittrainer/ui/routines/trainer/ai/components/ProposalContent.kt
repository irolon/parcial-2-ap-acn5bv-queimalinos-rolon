package com.fittrainer.ui.routines.trainer.ai.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import com.fittrainer.data.trainerai.AiProposalBlock
import com.fittrainer.data.trainerai.AiRoutineProposal
import com.fittrainer.ui.routines.trainer.ai.AI_RATIONALE
import com.fittrainer.ui.routines.trainer.prescription
import com.fittrainer.ui.routines.trainer.routineDaysLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** La propuesta (E15): el porqué plegable y una tarjeta por bloque. */
@Composable
fun ProposalContent(proposal: AiRoutineProposal) {
    var open by rememberSaveable { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        Column(Modifier.fillMaxWidth().clickable(role = Role.Button) { open = !open }.padding(vertical = Spacing.xs)) {
            Text("$AI_RATIONALE ${if (open) "▴" else "▾"}", style = MaterialTheme.typography.titleSmall, color = FtColors.Brand)
            if (open) Text(proposal.rationale, color = FtColors.TextSecondary)
        }
        proposal.blocks.forEach { BlockCard(it) }
    }
}

@Composable
private fun BlockCard(block: AiProposalBlock) {
    Card(colors = CardDefaults.cardColors(containerColor = FtColors.Surface), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(Spacing.md), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Text(block.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            Text(routineDaysLabel(block.days), style = MaterialTheme.typography.labelMedium, color = FtColors.Brand)
            block.exercises.forEach { e ->
                Text(e.name, color = FtColors.TextPrimary)
                Text(prescription(e.sets, e.reps, e.restSeconds, e.suggestedKg), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
                e.notes?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary) }
            }
        }
    }
}
