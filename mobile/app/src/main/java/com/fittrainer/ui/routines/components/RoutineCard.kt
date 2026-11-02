package com.fittrainer.ui.routines.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.routines.RoutineCardUi
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Una rutina asignada: nombre, objetivo, días y cantidad de ejercicios. La de hoy lleva la marca "HOY". */
@Composable
fun RoutineCard(card: RoutineCardUi, onClick: () -> Unit) {
    val shape = MaterialTheme.shapes.large
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(FtColors.Card)
            .border(1.dp, if (card.isToday) FtColors.Brand else FtColors.Border, shape)
            .clickable(onClickLabel = "Ver la rutina", role = Role.Button, onClick = onClick)
            .padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text(card.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary, modifier = Modifier.weight(1f))
            if (card.isToday) {
                Text(
                    "HOY",
                    style = MaterialTheme.typography.labelSmall,
                    color = FtColors.TextPrimary,
                    modifier = Modifier.background(FtColors.Brand, MaterialTheme.shapes.small).padding(horizontal = Spacing.sm, vertical = 2.dp),
                )
            }
        }
        card.goal?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary) }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Row(
                Modifier.semantics(mergeDescendants = true) { contentDescription = card.dayNames },
                horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
            ) {
                card.dayInitials.forEach { DayChip(it) }
            }
            Text(
                card.exercisesText,
                style = MaterialTheme.typography.labelSmall,
                color = FtColors.TextSecondary,
                modifier = Modifier.weight(1f).padding(start = Spacing.sm),
            )
        }
    }
}

@Composable
private fun DayChip(initial: String) {
    Box(Modifier.size(24.dp).background(FtColors.Elevated, CircleShape), contentAlignment = Alignment.Center) {
        Text(initial, style = MaterialTheme.typography.labelSmall, color = FtColors.TextPrimary)
    }
}
